/**
 * Reminder Processor Service
 * Processes RSVP reminder notifications based on reminderHours configuration
 */

import { RsvpReminderStatus, RsvpStatus } from "@/types/enum";
import {
	getUtcNowEpoch,
	calculateReminderTime,
	epochToDate,
	formatDateTimeFull,
} from "@/utils/datetime-utils";
import { sqlClient } from "@/lib/prismadb";
import { RsvpNotificationRouter } from "./rsvp-notification-router";
import logger from "@/lib/logger";

interface ProcessResult {
	processed: number;
	sent: number;
	failed: number;
	skipped: number;
	timestamp?: bigint;
}

export class ReminderProcessor {
	private notificationRouter: RsvpNotificationRouter;

	constructor() {
		this.notificationRouter = new RsvpNotificationRouter();
	}

	/**
	 * Process reminders due to be sent
	 * Called by scheduler/cron job
	 */
	async processDueReminders(): Promise<ProcessResult> {
		const now = getUtcNowEpoch();
		const windowStart = now - BigInt(5 * 60000); // 5 minutes ago
		const windowEnd = now + BigInt(5 * 60000); // 5 minutes from now

		// Query all stores with RSVP enabled
		const stores = await sqlClient.store.findMany({
			where: {
				rsvpSettings: {
					acceptReservation: true,
				},
			},
			include: {
				rsvpSettings: true,
			},
		});

		let totalProcessed = 0;
		let totalSent = 0;
		let totalFailed = 0;
		let totalSkipped = 0;

		for (const store of stores) {
			if (!store.rsvpSettings) continue;

			const result = await this.processStoreReminders(
				store.id,
				store.rsvpSettings,
			);
			totalProcessed += result.processed;
			totalSent += result.sent;
			totalFailed += result.failed;
			totalSkipped += result.skipped;
		}

		return {
			processed: totalProcessed,
			sent: totalSent,
			failed: totalFailed,
			skipped: totalSkipped,
			timestamp: now,
		};
	}

	/**
	 * Process reminders for a specific store
	 */
	private async processStoreReminders(
		storeId: string,
		rsvpSettings: {
			reminderHours: number | null;
		},
	): Promise<ProcessResult> {
		// Skip if no reminder hours configured
		if (!rsvpSettings.reminderHours || rsvpSettings.reminderHours <= 0) {
			return { processed: 0, sent: 0, failed: 0, skipped: 0 };
		}

		// Calculate reminder time window
		const now = getUtcNowEpoch();
		const windowStart = now - BigInt(5 * 60000);
		const windowEnd = now + BigInt(5 * 60000);
		const reminderOffsetMs = BigInt(rsvpSettings.reminderHours * 3600000);

		// Log time windows for debugging
		const nowDate = epochToDate(now);
		const windowStartDate = epochToDate(windowStart);
		const windowEndDate = epochToDate(windowEnd);
		const rsvpTimeQueryStartDate = epochToDate(windowStart + reminderOffsetMs);
		const rsvpTimeQueryEndDate = epochToDate(windowEnd + reminderOffsetMs);

		logger.info("Processing reminders - time windows", {
			metadata: {
				storeId,
				reminderHours: rsvpSettings.reminderHours,
				now: nowDate ? formatDateTimeFull(nowDate) : "invalid",
				windowStart: windowStartDate
					? formatDateTimeFull(windowStartDate)
					: "invalid",
				windowEnd: windowEndDate
					? formatDateTimeFull(windowEndDate)
					: "invalid",
				reminderOffsetMs: Number(reminderOffsetMs),
				rsvpTimeQueryStart: rsvpTimeQueryStartDate
					? formatDateTimeFull(rsvpTimeQueryStartDate)
					: "invalid",
				rsvpTimeQueryEnd: rsvpTimeQueryEndDate
					? formatDateTimeFull(rsvpTimeQueryEndDate)
					: "invalid",
			},
			tags: ["reminder", "processor", "time-window"],
		});

		// Query reservations due for reminders
		const reservations = await sqlClient.rsvp.findMany({
			where: {
				storeId,
				status: {
					in: [
						RsvpStatus.ReadyToConfirm,
						RsvpStatus.Ready,
						// Note: We don't include Pending (0) as those haven't been paid/confirmed yet
					],
				},
				rsvpTime: {
					gte: windowStart + reminderOffsetMs,
					lte: windowEnd + reminderOffsetMs,
				},
				RsvpReminderSent: null, // Not yet sent
			},
			include: {
				Facility: {
					select: {
						facilityName: true,
					},
				},
				ServiceStaff: {
					include: {
						User: {
							select: {
								name: true,
								email: true,
							},
						},
					},
				},
				Store: {
					select: {
						id: true,
						name: true,
						ownerId: true,
						defaultTimezone: true,
					},
				},
			},
		});

		let sent = 0;
		let failed = 0;
		let skipped = 0;

		for (const rsvp of reservations) {
			try {
				const result = await this.processReminder(rsvp, rsvpSettings);
				if (result === "sent") sent++;
				else if (result === "skipped") skipped++;
			} catch (error) {
				failed++;
				logger.error("Failed to process reminder", {
					metadata: {
						rsvpId: rsvp.id,
						storeId,
						error: error instanceof Error ? error.message : String(error),
					},
					tags: ["rsvp", "reminder", "error"],
				});
			}
		}

		return {
			processed: reservations.length,
			sent,
			failed,
			skipped,
		};
	}

	/**
	 * Process reminder for a single reservation
	 */
	private async processReminder(
		rsvp: {
			id: string;
			storeId: string;
			customerId: string | null;
			checkInCode: string | null;
			rsvpTime: bigint;
			numOfAdult: number;
			numOfChild: number;
			message: string | null;
			Facility: { facilityName: string } | null;
			ServiceStaff: {
				User: { name: string | null; email: string | null } | null;
			} | null;
			Store: {
				id: string;
				name: string;
				ownerId: string;
				defaultTimezone: string | null;
			};
		},
		rsvpSettings: {
			reminderHours: number | null;
		},
	): Promise<"sent" | "skipped"> {
		if (!rsvpSettings.reminderHours || rsvpSettings.reminderHours <= 0) {
			return "skipped";
		}

		// Calculate reminder scheduled time
		const reminderScheduledAt = calculateReminderTime(
			rsvp.rsvpTime,
			rsvpSettings.reminderHours,
			rsvp.Store.defaultTimezone || "UTC",
		);

		// Check if reminder already sent (double-check)
		const existingReminder = await sqlClient.rsvpReminderSent.findUnique({
			where: { rsvpId: rsvp.id },
		});

		if (existingReminder) {
			return "skipped"; // Already sent
		}

		// Load customer information
		let customer: {
			name: string | null;
			email: string | null;
			phoneNumber: string | null;
			locale: string | null;
		} | null = null;
		if (rsvp.customerId) {
			customer = await sqlClient.user.findUnique({
				where: { id: rsvp.customerId },
				select: {
					name: true,
					email: true,
					phoneNumber: true,
					locale: true,
				},
			});
		}

		// Build notification context
		const serviceStaffName =
			rsvp.ServiceStaff?.User?.name || rsvp.ServiceStaff?.User?.email || null;

		const context = {
			rsvpId: rsvp.id,
			storeId: rsvp.storeId,
			checkInCode: rsvp.checkInCode ?? null,
			eventType: "reminder" as const,
			customerId: rsvp.customerId,
			customerName: customer?.name || null,
			customerEmail: customer?.email || null,
			customerPhone: customer?.phoneNumber || null,
			storeName: rsvp.Store.name,
			storeOwnerId: rsvp.Store.ownerId,
			rsvpTime: rsvp.rsvpTime,
			facilityName: rsvp.Facility?.facilityName || null,
			serviceStaffName,
			numOfAdult: rsvp.numOfAdult,
			numOfChild: rsvp.numOfChild,
			message: rsvp.message,
			locale: (customer?.locale as "en" | "tw" | "jp") || "en",
		};

		// Send reminder notification
		let notificationId: string | null = null;
		try {
			notificationId = await this.notificationRouter.handleReminder(context);
		} catch (error) {
			// Log error and create tracking record with failed status
			await sqlClient.rsvpReminderSent.create({
				data: {
					rsvpId: rsvp.id,
					storeId: rsvp.storeId,
					customerId: rsvp.customerId,
					reminderScheduledAt,
					reminderSentAt: getUtcNowEpoch(),
					status: RsvpReminderStatus.Failed, // 10
					errorMessage: error instanceof Error ? error.message : String(error),
					createdAt: getUtcNowEpoch(),
					updatedAt: getUtcNowEpoch(),
				},
			});
			throw error;
		}

		// Track reminder as sent
		await sqlClient.rsvpReminderSent.create({
			data: {
				rsvpId: rsvp.id,
				storeId: rsvp.storeId,
				customerId: rsvp.customerId,
				reminderScheduledAt,
				reminderSentAt: getUtcNowEpoch(),
				notificationId,
				status: RsvpReminderStatus.Sent, // 0
				createdAt: getUtcNowEpoch(),
				updatedAt: getUtcNowEpoch(),
			},
		});

		return "sent";
	}
}
