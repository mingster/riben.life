/**
 * Sends “please confirm your reservation” notifications for RSVPs in Ready,
 * scheduled at createdAt + confirmHours (store setting).
 */

import { RsvpReminderStatus, RsvpStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { sqlClient } from "@/lib/prismadb";
import { RsvpNotificationRouter } from "./rsvp-notification-router";
import logger from "@/lib/logger";
import { signRsvpCustomerConfirmToken } from "@/utils/rsvp-customer-confirm-token";
import { getBaseUrlForMail } from "@/lib/notification/email-template";

interface ProcessResult {
	processed: number;
	sent: number;
	failed: number;
	skipped: number;
	timestamp?: bigint;
}

function effectiveConfirmHours(raw: number | null | undefined): number {
	const n = raw ?? 24;
	return Math.max(n, 1);
}

export class CustomerConfirmProcessor {
	private notificationRouter: RsvpNotificationRouter;

	constructor() {
		this.notificationRouter = new RsvpNotificationRouter();
	}

	async processDueCustomerConfirmRequests(): Promise<ProcessResult> {
		const now = getUtcNowEpoch();

		const stores = await sqlClient.store.findMany({
			where: {
				rsvpSettings: {
					acceptReservation: true,
					noNeedToConfirm: false,
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

			const result = await this.processStoreCustomerConfirm(
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

	private async processStoreCustomerConfirm(
		storeId: string,
		rsvpSettings: {
			confirmHours: number | null;
		},
	): Promise<ProcessResult> {
		const hours = effectiveConfirmHours(rsvpSettings.confirmHours);
		const confirmMs = BigInt(hours * 3600000);
		const fiveMin = BigInt(5 * 60000);
		const now = getUtcNowEpoch();

		const createdLower = now - confirmMs - fiveMin;
		const createdUpper = now - confirmMs + fiveMin;

		const candidates = await sqlClient.rsvp.findMany({
			where: {
				storeId,
				status: RsvpStatus.Ready,
				createdAt: {
					gte: createdLower,
					lte: createdUpper,
				},
				RsvpCustomerConfirmSent: null,
			},
			include: {
				Facility: { select: { facilityName: true } },
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

		for (const rsvp of candidates) {
			try {
				const result = await this.processOneCustomerConfirm(rsvp, confirmMs);
				if (result === "sent") sent++;
				else if (result === "skipped") skipped++;
			} catch (error) {
				failed++;
				logger.error("Customer confirm notification failed", {
					metadata: {
						rsvpId: rsvp.id,
						storeId,
						error: error instanceof Error ? error.message : String(error),
					},
					tags: ["rsvp", "customer_confirm", "error"],
				});
			}
		}

		return {
			processed: candidates.length,
			sent,
			failed,
			skipped,
		};
	}

	private async processOneCustomerConfirm(
		rsvp: {
			id: string;
			storeId: string;
			customerId: string | null;
			createdAt: bigint;
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
		confirmMs: bigint,
	): Promise<"sent" | "skipped"> {
		const scheduledAt = rsvp.createdAt + confirmMs;

		const existing = await sqlClient.rsvpCustomerConfirmSent.findUnique({
			where: { rsvpId: rsvp.id },
		});
		if (existing) {
			return "skipped";
		}

		if (!rsvp.customerId) {
			logger.info("Skipping customer confirm (anonymous / no user)", {
				metadata: { rsvpId: rsvp.id, storeId: rsvp.storeId },
				tags: ["rsvp", "customer_confirm", "skip"],
			});
			const nowEpoch = getUtcNowEpoch();
			await sqlClient.rsvpCustomerConfirmSent.create({
				data: {
					rsvpId: rsvp.id,
					storeId: rsvp.storeId,
					customerId: null,
					scheduledAt,
					sentAt: nowEpoch,
					status: RsvpReminderStatus.Skipped,
					errorMessage: "no_customer_id",
					createdAt: nowEpoch,
					updatedAt: nowEpoch,
				},
			});
			return "skipped";
		}

		let token: string;
		try {
			token = signRsvpCustomerConfirmToken({
				storeId: rsvp.storeId,
				rsvpId: rsvp.id,
			});
		} catch (e) {
			logger.error(
				"Cannot sign customer confirm token — check RSVP_CUSTOMER_CONFIRM_SECRET / AUTH secrets",
				{
					metadata: {
						rsvpId: rsvp.id,
						error: e instanceof Error ? e.message : String(e),
					},
					tags: ["rsvp", "customer_confirm", "config"],
				},
			);
			throw e;
		}

		const baseUrl = getBaseUrlForMail().replace(/\/$/, "");
		const confirmUrl = `${baseUrl}/s/${rsvp.storeId}/reservation/customer-confirm?token=${encodeURIComponent(token)}`;

		const customer = await sqlClient.user.findUnique({
			where: { id: rsvp.customerId },
			select: {
				name: true,
				email: true,
				phoneNumber: true,
				locale: true,
			},
		});

		const serviceStaffName =
			rsvp.ServiceStaff?.User?.name || rsvp.ServiceStaff?.User?.email || null;

		const locale = (customer?.locale as "en" | "tw" | "jp") || "en";

		const context = {
			rsvpId: rsvp.id,
			storeId: rsvp.storeId,
			eventType: "customer_confirm_required" as const,
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
			locale,
			actionUrl: confirmUrl,
			checkInCode: null,
		};

		let notificationId: string | null = null;
		try {
			notificationId =
				await this.notificationRouter.handleCustomerConfirmRequired(context);
		} catch (error) {
			const nowEpoch = getUtcNowEpoch();
			await sqlClient.rsvpCustomerConfirmSent.create({
				data: {
					rsvpId: rsvp.id,
					storeId: rsvp.storeId,
					customerId: rsvp.customerId,
					scheduledAt,
					sentAt: nowEpoch,
					status: RsvpReminderStatus.Failed,
					errorMessage: error instanceof Error ? error.message : String(error),
					createdAt: nowEpoch,
					updatedAt: nowEpoch,
				},
			});
			throw error;
		}

		const nowEpoch = getUtcNowEpoch();
		await sqlClient.rsvpCustomerConfirmSent.create({
			data: {
				rsvpId: rsvp.id,
				storeId: rsvp.storeId,
				customerId: rsvp.customerId,
				scheduledAt,
				sentAt: nowEpoch,
				notificationId: notificationId ?? null,
				status: RsvpReminderStatus.Sent,
				createdAt: nowEpoch,
				updatedAt: nowEpoch,
			},
		});

		return "sent";
	}
}
