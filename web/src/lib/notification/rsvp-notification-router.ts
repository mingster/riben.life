/**
 * RSVP Notification Router
 * Centralized router for sending notifications related to RSVP transactions
 * All store RSVP transactions should call this router, which sends notifications
 * to customers or stores according to business logic.
 */

import {
	getNotificationT,
	type NotificationT,
} from "@/lib/notification/notification-i18n";
import { sqlClient } from "@/lib/prismadb";
import { NotificationService } from "./notification-service";
import { PreferenceManager } from "./preference-manager";
import logger from "@/lib/logger";
import type { NotificationChannel } from "./types";
import { RsvpStatus } from "@/types/enum";
import {
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import { format } from "date-fns";

export type RsvpEventType =
	| "created"
	| "updated"
	| "cancelled"
	| "deleted"
	| "confirmed_by_store"
	| "confirmed_by_customer"
	| "status_changed"
	| "payment_received"
	| "ready"
	| "completed"
	| "no_show"
	| "unpaid_order_created"
	| "reminder";

export interface RsvpNotificationContext {
	rsvpId: string;
	storeId: string;
	eventType: RsvpEventType;
	customerId?: string | null;
	customerName?: string | null;
	customerEmail?: string | null;
	customerPhone?: string | null;
	storeName?: string | null;
	storeOwnerId?: string | null;
	rsvpTime?: bigint | null;
	arriveTime?: bigint | null;
	status?: number;
	previousStatus?: number;
	facilityName?: string | null;
	serviceStaffName?: string | null;
	numOfAdult?: number;
	numOfChild?: number;
	message?: string | null;
	refundAmount?: number | null;
	refundCurrency?: string | null;
	actionUrl?: string | null;
	/** Locale for notification subject/message (en, tw, jp). Defaults to "en". */
	locale?: "en" | "tw" | "jp";
}

export class RsvpNotificationRouter {
	private notificationService: NotificationService;
	private preferenceManager: PreferenceManager;

	constructor() {
		this.notificationService = new NotificationService();
		this.preferenceManager = new PreferenceManager();
	}

	/**
	 * Get notification channels based on store's RsvpSettings and recipient's preferences
	 * Always includes "onsite" (built-in channel)
	 * Includes other channels based on:
	 * 1. Store's RsvpSettings flags (must be enabled at store level)
	 * 2. Recipient's notification preferences (must be enabled by recipient)
	 * Defaults to ["onsite", "email"] if no RsvpSettings found
	 */
	private async getRsvpNotificationChannels(
		storeId: string,
		recipientId: string | null | undefined,
	): Promise<NotificationChannel[]> {
		const rsvpSettings = await sqlClient.rsvpSettings.findUnique({
			where: { storeId },
			select: {
				useReminderEmail: true,
				useReminderLine: true,
				useReminderPush: true,
				useReminderSMS: true,
				useReminderTelegram: true,
				useReminderWhatsapp: true,
				useReminderWechat: true,
			},
		});

		const channels: NotificationChannel[] = ["onsite"]; // Always include onsite

		// If no settings found, default to email as well
		if (!rsvpSettings) {
			channels.push("email");
			// Still filter by recipient preferences if recipientId is provided
			if (recipientId) {
				return this.filterChannelsByRecipientPreferences(
					channels,
					recipientId,
					storeId,
				);
			}
			return channels;
		}

		// Add channels based on store settings
		if (rsvpSettings.useReminderEmail) {
			channels.push("email");
		}
		if (rsvpSettings.useReminderLine) {
			channels.push("line");
		}
		if (rsvpSettings.useReminderPush) {
			channels.push("push");
		}
		if (rsvpSettings.useReminderSMS) {
			channels.push("sms");
		}
		if (rsvpSettings.useReminderTelegram) {
			channels.push("telegram");
		}
		if (rsvpSettings.useReminderWhatsapp) {
			channels.push("whatsapp");
		}
		if (rsvpSettings.useReminderWechat) {
			channels.push("wechat");
		}

		// Filter channels based on recipient's preferences
		if (recipientId) {
			return this.filterChannelsByRecipientPreferences(
				channels,
				recipientId,
				storeId,
			);
		}

		return channels;
	}

	/**
	 * Filter channels based on recipient's notification preferences
	 */
	private async filterChannelsByRecipientPreferences(
		channels: NotificationChannel[],
		recipientId: string,
		storeId: string,
	): Promise<NotificationChannel[]> {
		const userPreferences = await this.preferenceManager.getUserPreferences(
			recipientId,
			storeId,
		);

		// Filter channels based on user preferences
		// "onsite" is always allowed
		const allowedChannels = channels.filter((channel) => {
			if (channel === "onsite") {
				return true; // Onsite is always allowed
			}

			// Map channel to preference key
			const preferenceKey = `${channel}Enabled` as keyof typeof userPreferences;
			return userPreferences[preferenceKey] !== false;
		});

		return allowedChannels;
	}

	/**
	 * Route notification for RSVP event
	 * Determines who to notify (customer or store) based on business logic
	 */
	async routeNotification(context: RsvpNotificationContext): Promise<void> {
		try {
			logger.info("Routing RSVP notification", {
				metadata: {
					rsvpId: context.rsvpId,
					storeId: context.storeId,
					eventType: context.eventType,
					customerId: context.customerId,
				},
				tags: ["rsvp", "notification", "router"],
			});

			// Get store information if not provided
			if (!context.storeName || !context.storeOwnerId) {
				const store = await sqlClient.store.findUnique({
					where: { id: context.storeId },
					select: {
						name: true,
						ownerId: true,
					},
				});

				if (store) {
					context.storeName = store.name;
					context.storeOwnerId = store.ownerId;
				}
			}

			// Route based on event type
			switch (context.eventType) {
				case "created":
					await this.handleCreated(context);
					break;
				case "updated":
					await this.handleUpdated(context);
					break;
				case "cancelled":
					await this.handleCancelled(context);
					break;
				case "deleted":
					await this.handleDeleted(context);
					break;
				case "confirmed_by_store":
					await this.handleConfirmedByStore(context);
					break;
				case "confirmed_by_customer":
					await this.handleConfirmedByCustomer(context);
					break;
				case "status_changed":
					await this.handleStatusChanged(context);
					break;
				case "payment_received":
					await this.handlePaymentReceived(context);
					break;
				case "ready":
					await this.handleReady(context);
					break;
				case "completed":
					await this.handleCompleted(context);
					break;
				case "no_show":
					await this.handleNoShow(context);
					break;
				case "unpaid_order_created":
					await this.handleUnpaidOrderCreated(context);
					break;
				case "reminder":
					await this.handleReminder(context);
					break;
				default:
					logger.warn("Unknown RSVP event type", {
						metadata: {
							eventType: context.eventType,
							rsvpId: context.rsvpId,
						},
						tags: ["rsvp", "notification", "warning"],
					});
			}
		} catch (error) {
			logger.error("Failed to route RSVP notification", {
				metadata: {
					rsvpId: context.rsvpId,
					storeId: context.storeId,
					eventType: context.eventType,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["rsvp", "notification", "error"],
			});
			// Don't throw - notification failures shouldn't break RSVP operations
		}
	}

	/**
	 * notifiy store owner about the new reservation
	 * Handle reservation created event
	 * Notify: Store (new reservation request)
	 */
	private async handleCreated(context: RsvpNotificationContext) {
		if (!context.storeOwnerId) {
			return;
		}

		const t = getNotificationT(context.locale || "en");
		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
			t,
		);
		const customerName =
			context.customerName || context.customerEmail || t("notif_anonymous");

		const subject = t("notif_subject_new_reservation_request", {
			customerName,
		});
		const message = this.buildCreatedMessage(context, rsvpTimeFormatted, t);

		const channels = await this.getRsvpNotificationChannels(
			context.storeId,
			context.storeOwnerId,
		);

		await this.notificationService.createNotification({
			senderId: context.customerId || context.storeOwnerId, // Use customer if available, otherwise store owner
			recipientId: context.storeOwnerId,
			storeId: context.storeId,
			subject,
			message,
			notificationType: "reservation",
			actionUrl:
				context.actionUrl || `/storeAdmin/${context.storeId}/rsvp/history`,
			priority: 1, // High priority for new reservations
			channels,
		});
	}

	/**
	 * Handle reservation updated event
	 * Notify: Store (reservation modified)
	 */
	private async handleUpdated(context: RsvpNotificationContext) {
		if (!context.storeOwnerId) {
			return;
		}

		const t = getNotificationT(context.locale || "en");
		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
			t,
		);
		const customerName =
			context.customerName || context.customerEmail || t("notif_anonymous");

		const subject = t("notif_subject_reservation_updated", { customerName });
		const message = this.buildUpdatedMessage(context, rsvpTimeFormatted, t);

		const channels = await this.getRsvpNotificationChannels(
			context.storeId,
			context.storeOwnerId,
		);

		await this.notificationService.createNotification({
			senderId: context.customerId || context.storeOwnerId,
			recipientId: context.storeOwnerId,
			storeId: context.storeId,
			subject,
			message,
			notificationType: "reservation",
			actionUrl: context.actionUrl || `/storeAdmin/${context.storeId}/rsvp`,
			priority: 1,
			channels,
		});
	}

	/**
	 * Handle reservation cancelled event
	 * Notify: Store (reservation cancelled)
	 * Notify: Customer (if logged in or has contact info)
	 */
	private async handleCancelled(context: RsvpNotificationContext) {
		const t = getNotificationT(context.locale || "en");
		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
			t,
		);
		const customerName =
			context.customerName || context.customerEmail || t("notif_anonymous");

		// Notify store
		if (context.storeOwnerId) {
			const storeSubject = t("notif_subject_reservation_cancelled", {
				customerName,
			});
			const storeMessage = this.buildCancelledMessage(
				context,
				rsvpTimeFormatted,
				true, // isStore
				t,
			);

			const channels = await this.getRsvpNotificationChannels(
				context.storeId,
				context.storeOwnerId,
			);

			await this.notificationService.createNotification({
				senderId: context.customerId || context.storeOwnerId,
				recipientId: context.storeOwnerId,
				storeId: context.storeId,
				subject: storeSubject,
				message: storeMessage,
				notificationType: "reservation",
				actionUrl: context.actionUrl || `/storeAdmin/${context.storeId}/rsvp`,
				priority: 0,
				channels,
			});
		}

		// Notify customer (if logged in)
		if (context.customerId) {
			const customerSubject = t("notif_subject_your_reservation_cancelled");
			const customerMessage = this.buildCancelledMessage(
				context,
				rsvpTimeFormatted,
				false, // isStore
				t,
			);

			const channels = await this.getRsvpNotificationChannels(
				context.storeId,
				context.customerId,
			);

			await this.notificationService.createNotification({
				senderId: context.storeOwnerId || context.customerId,
				recipientId: context.customerId,
				storeId: context.storeId,
				subject: customerSubject,
				message: customerMessage,
				notificationType: "reservation",
				actionUrl:
					context.actionUrl || `/s/${context.storeId}/reservation/history`,
				priority: 0,
				channels,
			});
		}
	}

	/**
	 * Handle reservation deleted event
	 * Notify: Store (reservation deleted)
	 */
	private async handleDeleted(context: RsvpNotificationContext) {
		if (!context.storeOwnerId) {
			return;
		}

		const t = getNotificationT(context.locale || "en");
		const customerName =
			context.customerName || context.customerEmail || t("notif_anonymous");

		const subject = t("notif_subject_reservation_deleted", { customerName });
		const message = this.buildDeletedMessage(context, t);

		const channels = await this.getRsvpNotificationChannels(
			context.storeId,
			context.storeOwnerId,
		);

		await this.notificationService.createNotification({
			senderId: context.customerId || context.storeOwnerId,
			recipientId: context.storeOwnerId,
			storeId: context.storeId,
			subject,
			message,
			notificationType: "reservation",
			actionUrl: context.actionUrl || `/storeAdmin/${context.storeId}/rsvp`,
			priority: 0,
			channels,
		});
	}

	/**
	 * Handle store confirmation event
	 * Notify: Customer (reservation confirmed by store)
	 */
	private async handleConfirmedByStore(context: RsvpNotificationContext) {
		if (!context.customerId) {
			return; // Can't notify anonymous customers
		}

		const t = getNotificationT(context.locale || "en");
		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
			t,
		);

		const subject = t("notif_subject_your_reservation_confirmed");
		const message = this.buildConfirmedMessage(
			context,
			rsvpTimeFormatted,
			true, // confirmedByStore
			t,
		);

		const channels = await this.getRsvpNotificationChannels(
			context.storeId,
			context.customerId,
		);

		await this.notificationService.createNotification({
			senderId: context.storeOwnerId || context.customerId,
			recipientId: context.customerId,
			storeId: context.storeId,
			subject,
			message,
			notificationType: "reservation",
			actionUrl:
				context.actionUrl || `/s/${context.storeId}/reservation/history`,
			priority: 1,
			channels,
		});
	}

	/**
	 * Handle customer confirmation event
	 * Notify: Store (customer confirmed reservation)
	 */
	private async handleConfirmedByCustomer(context: RsvpNotificationContext) {
		if (!context.storeOwnerId) {
			return;
		}

		const t = getNotificationT(context.locale || "en");
		const customerName =
			context.customerName || context.customerEmail || t("notif_anonymous");

		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
			t,
		);

		const subject = t("notif_subject_customer_confirmed_reservation", {
			customerName,
		});
		const message = this.buildConfirmedMessage(
			context,
			rsvpTimeFormatted,
			false, // confirmedByStore
			t,
		);

		const channels = await this.getRsvpNotificationChannels(
			context.storeId,
			context.storeOwnerId,
		);

		await this.notificationService.createNotification({
			senderId: context.customerId || context.storeOwnerId,
			recipientId: context.storeOwnerId,
			storeId: context.storeId,
			subject,
			message,
			notificationType: "reservation",
			actionUrl: context.actionUrl || `/storeAdmin/${context.storeId}/rsvp`,
			priority: 0,
			channels,
		});
	}

	/**
	 * Handle status changed event
	 * Notify based on status transition
	 */
	private async handleStatusChanged(context: RsvpNotificationContext) {
		if (!context.status || context.previousStatus === undefined) {
			return;
		}

		const t = getNotificationT(context.locale || "en");

		// Handle specific status transitions
		if (context.status === RsvpStatus.ReadyToConfirm) {
			// Notify store when reservation is ready to confirm
			if (context.storeOwnerId) {
				const customerName =
					context.customerName || context.customerEmail || t("notif_anonymous");

				const subject = t("notif_subject_reservation_ready_to_confirm", {
					customerName,
				});
				const message = await this.buildStatusChangedMessage(
					context,
					context.previousStatus,
					context.status,
					t,
				);

				const channels = await this.getRsvpNotificationChannels(
					context.storeId,
					context.storeOwnerId,
				);

				await this.notificationService.createNotification({
					senderId: context.customerId || context.storeOwnerId,
					recipientId: context.storeOwnerId,
					storeId: context.storeId,
					subject,
					message,
					notificationType: "reservation",
					actionUrl: context.actionUrl || `/storeAdmin/${context.storeId}/rsvp`,
					priority: 1,
					channels,
				});
			}
		} else if (context.status === RsvpStatus.Ready) {
			// Notify customer when reservation is ready
			if (context.customerId) {
				const subject = t("notif_subject_your_reservation_ready");
				const message = await this.buildStatusChangedMessage(
					context,
					context.previousStatus,
					context.status,
					t,
				);

				const channels = await this.getRsvpNotificationChannels(
					context.storeId,
					context.customerId,
				);

				await this.notificationService.createNotification({
					senderId: context.storeOwnerId || context.customerId,
					recipientId: context.customerId,
					storeId: context.storeId,
					subject,
					message,
					notificationType: "reservation",
					actionUrl:
						context.actionUrl || `/s/${context.storeId}/reservation/history`,
					priority: 1,
					channels,
				});
			}
		}
	}

	/**
	 * Handle payment received event
	 * Notify: Store (payment received for reservation)
	 */
	private async handlePaymentReceived(context: RsvpNotificationContext) {
		if (!context.storeOwnerId) {
			return;
		}

		const t = getNotificationT(context.locale || "en");
		const customerName =
			context.customerName || context.customerEmail || t("notif_anonymous");

		const subject = t("notif_subject_payment_received_for_reservation", {
			customerName,
		});
		const message = await this.buildPaymentReceivedMessage(context, t);

		const channels = await this.getRsvpNotificationChannels(
			context.storeId,
			context.storeOwnerId,
		);

		await this.notificationService.createNotification({
			senderId: context.customerId || context.storeOwnerId,
			recipientId: context.storeOwnerId,
			storeId: context.storeId,
			subject,
			message,
			notificationType: "reservation",
			actionUrl: context.actionUrl || `/storeAdmin/${context.storeId}/rsvp`,
			priority: 1,
			channels,
		});
	}

	/**
	 * Handle ready event
	 * Notify: Customer (reservation is ready)
	 */
	private async handleReady(context: RsvpNotificationContext) {
		if (!context.customerId) {
			return;
		}

		const t = getNotificationT(context.locale || "en");
		const subject = t("notif_subject_your_reservation_ready");
		const message = await this.buildReadyMessage(context, t);

		const channels = await this.getRsvpNotificationChannels(
			context.storeId,
			context.customerId,
		);

		await this.notificationService.createNotification({
			senderId: context.storeOwnerId || context.customerId,
			recipientId: context.customerId,
			storeId: context.storeId,
			subject,
			message,
			notificationType: "reservation",
			actionUrl:
				context.actionUrl || `/s/${context.storeId}/reservation/history`,
			priority: 1,
			channels,
		});
	}

	/**
	 * Handle completed event
	 * Notify: Customer (reservation completed)
	 */
	private async handleCompleted(context: RsvpNotificationContext) {
		if (!context.customerId) {
			return;
		}

		const t = getNotificationT(context.locale || "en");
		const subject = t("notif_subject_your_reservation_completed");
		const message = await this.buildCompletedMessage(context, t);

		const channels = await this.getRsvpNotificationChannels(
			context.storeId,
			context.customerId,
		);

		await this.notificationService.createNotification({
			senderId: context.storeOwnerId || context.customerId,
			recipientId: context.customerId,
			storeId: context.storeId,
			subject,
			message,
			notificationType: "reservation",
			actionUrl:
				context.actionUrl || `/s/${context.storeId}/reservation/history`,
			priority: 0,
			channels,
		});
	}

	/**
	 * Handle no-show event
	 * Notify: Store (customer no-show)
	 */
	private async handleNoShow(context: RsvpNotificationContext) {
		if (!context.storeOwnerId) {
			return;
		}

		const t = getNotificationT(context.locale || "en");
		const customerName =
			context.customerName || context.customerEmail || t("notif_anonymous");

		const subject = t("notif_subject_no_show", { customerName });
		const message = await this.buildNoShowMessage(context, t);

		const channels = await this.getRsvpNotificationChannels(
			context.storeId,
			context.storeOwnerId,
		);

		await this.notificationService.createNotification({
			senderId: context.storeOwnerId,
			recipientId: context.storeOwnerId,
			storeId: context.storeId,
			subject,
			message,
			notificationType: "reservation",
			actionUrl: context.actionUrl || `/storeAdmin/${context.storeId}/rsvp`,
			priority: 0,
			channels,
		});
	}

	// Message builders
	private buildCreatedMessage(
		context: RsvpNotificationContext,
		rsvpTimeFormatted: string,
		t: NotificationT,
	): string {
		const parts: string[] = [];
		parts.push(t("notif_msg_new_reservation_intro"));
		parts.push(``);
		parts.push(
			`${t("notif_label_customer")}: ${context.customerName || context.customerEmail || t("notif_anonymous")}`,
		);
		if (context.facilityName) {
			parts.push(`${t("notif_label_facility")}: ${context.facilityName}`);
		}
		if (context.serviceStaffName) {
			parts.push(
				`${t("notif_label_service_staff")}: ${context.serviceStaffName}`,
			);
		}
		parts.push(`${t("notif_label_date_time")}: ${rsvpTimeFormatted}`);
		parts.push(
			t("notif_party_size", {
				adults: context.numOfAdult || 1,
				children: context.numOfChild || 0,
			}),
		);
		if (context.message) {
			parts.push(`${t("notif_label_message")}: ${context.message}`);
		}
		return parts.join("\n");
	}

	private buildUpdatedMessage(
		context: RsvpNotificationContext,
		rsvpTimeFormatted: string,
		t: NotificationT,
	): string {
		const parts: string[] = [];
		parts.push(t("notif_msg_reservation_updated_intro"));
		parts.push(``);
		parts.push(
			`${t("notif_label_customer")}: ${context.customerName || context.customerEmail || t("notif_anonymous")}`,
		);
		if (context.facilityName) {
			parts.push(`${t("notif_label_facility")}: ${context.facilityName}`);
		}
		parts.push(`${t("notif_label_date_time")}: ${rsvpTimeFormatted}`);
		parts.push(
			t("notif_party_size", {
				adults: context.numOfAdult || 1,
				children: context.numOfChild || 0,
			}),
		);
		if (context.message) {
			parts.push(`${t("notif_label_message")}: ${context.message}`);
		}
		return parts.join("\n");
	}

	private buildCancelledMessage(
		context: RsvpNotificationContext,
		rsvpTimeFormatted: string,
		isStore: boolean,
		t: NotificationT,
	): string {
		const parts: string[] = [];
		if (isStore) {
			parts.push(t("notif_msg_reservation_cancelled_intro"));
			parts.push(``);
			parts.push(
				`${t("notif_label_customer")}: ${context.customerName || context.customerEmail || t("notif_anonymous")}`,
			);
		} else {
			parts.push(t("notif_msg_your_reservation_cancelled_intro"));
			parts.push(``);
			parts.push(
				`${t("notif_label_store")}: ${context.storeName || t("notif_store")}`,
			);
		}
		if (context.facilityName) {
			parts.push(`${t("notif_label_facility")}: ${context.facilityName}`);
		}
		parts.push(`${t("notif_label_date_time")}: ${rsvpTimeFormatted}`);
		if (context.refundAmount && context.refundAmount > 0) {
			parts.push(
				`${t("notif_label_refund_amount")}: ${context.refundAmount} ${context.refundCurrency || ""}`,
			);
		}
		return parts.join("\n");
	}

	private buildDeletedMessage(
		context: RsvpNotificationContext,
		t: NotificationT,
	): string {
		const parts: string[] = [];
		parts.push(t("notif_msg_reservation_deleted_intro"));
		parts.push(``);
		parts.push(
			`${t("notif_label_customer")}: ${context.customerName || context.customerEmail || t("notif_anonymous")}`,
		);
		if (context.facilityName) {
			parts.push(`${t("notif_label_facility")}: ${context.facilityName}`);
		}
		return parts.join("\n");
	}

	private buildConfirmedMessage(
		context: RsvpNotificationContext,
		rsvpTimeFormatted: string,
		confirmedByStore: boolean,
		t: NotificationT,
	): string {
		const parts: string[] = [];
		if (confirmedByStore) {
			parts.push(t("notif_msg_your_reservation_confirmed_by_store_intro"));
			parts.push(``);
			parts.push(
				`${t("notif_label_store")}: ${context.storeName || t("notif_store")}`,
			);
		} else {
			parts.push(t("notif_msg_customer_confirmed_intro"));
			parts.push(``);
			parts.push(
				`${t("notif_label_customer")}: ${context.customerName || context.customerEmail || t("notif_anonymous")}`,
			);
		}
		if (context.facilityName) {
			parts.push(`${t("notif_label_facility")}: ${context.facilityName}`);
		}
		parts.push(`${t("notif_label_date_time")}: ${rsvpTimeFormatted}`);
		parts.push(
			t("notif_party_size", {
				adults: context.numOfAdult || 1,
				children: context.numOfChild || 0,
			}),
		);
		return parts.join("\n");
	}

	private static readonly STATUS_KEYS: Record<number, string> = {
		[RsvpStatus.Pending]: "notif_status_Pending",
		[RsvpStatus.ReadyToConfirm]: "notif_status_ReadyToConfirm",
		[RsvpStatus.Ready]: "notif_status_Ready",
		[RsvpStatus.Completed]: "notif_status_Completed",
		[RsvpStatus.Cancelled]: "notif_status_Cancelled",
		[RsvpStatus.NoShow]: "notif_status_NoShow",
	};

	private async buildStatusChangedMessage(
		context: RsvpNotificationContext,
		previousStatus: number,
		newStatus: number,
		t: NotificationT,
	): Promise<string> {
		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
			t,
		);

		const parts: string[] = [];
		parts.push(t("notif_msg_reservation_status_changed_intro"));
		parts.push(``);
		parts.push(
			`${t("notif_label_from")}: ${t(RsvpNotificationRouter.STATUS_KEYS[previousStatus] ?? "notif_na")}`,
		);
		parts.push(
			`${t("notif_label_to")}: ${t(RsvpNotificationRouter.STATUS_KEYS[newStatus] ?? "notif_na")}`,
		);
		if (context.facilityName) {
			parts.push(`${t("notif_label_facility")}: ${context.facilityName}`);
		}
		parts.push(`${t("notif_label_date_time")}: ${rsvpTimeFormatted}`);
		return parts.join("\n");
	}

	private async buildPaymentReceivedMessage(
		context: RsvpNotificationContext,
		t: NotificationT,
	): Promise<string> {
		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
			t,
		);

		const parts: string[] = [];
		parts.push(t("notif_msg_payment_received_intro"));
		parts.push(``);
		parts.push(
			`${t("notif_label_customer")}: ${context.customerName || context.customerEmail || t("notif_anonymous")}`,
		);
		if (context.facilityName) {
			parts.push(`${t("notif_label_facility")}: ${context.facilityName}`);
		}
		parts.push(`${t("notif_label_date_time")}: ${rsvpTimeFormatted}`);
		return parts.join("\n");
	}

	private async buildReadyMessage(
		context: RsvpNotificationContext,
		t: NotificationT,
	): Promise<string> {
		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
			t,
		);
		const arriveTimeFormatted = context.arriveTime
			? await this.formatRsvpTime(context.arriveTime, context.storeId, t)
			: null;

		const parts: string[] = [];
		parts.push(t("notif_msg_your_reservation_ready_intro"));
		parts.push(``);
		parts.push(
			`${t("notif_label_store")}: ${context.storeName || t("notif_store")}`,
		);
		if (context.facilityName) {
			parts.push(`${t("notif_label_facility")}: ${context.facilityName}`);
		}
		parts.push(`${t("notif_label_date_time")}: ${rsvpTimeFormatted}`);
		if (arriveTimeFormatted) {
			parts.push(`${t("notif_label_arrival_time")}: ${arriveTimeFormatted}`);
		}
		return parts.join("\n");
	}

	private async buildCompletedMessage(
		context: RsvpNotificationContext,
		t: NotificationT,
	): Promise<string> {
		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
			t,
		);

		const parts: string[] = [];
		parts.push(t("notif_msg_your_reservation_completed_intro"));
		parts.push(``);
		parts.push(
			`${t("notif_label_store")}: ${context.storeName || t("notif_store")}`,
		);
		if (context.facilityName) {
			parts.push(`${t("notif_label_facility")}: ${context.facilityName}`);
		}
		parts.push(`${t("notif_label_date_time")}: ${rsvpTimeFormatted}`);
		return parts.join("\n");
	}

	private async buildNoShowMessage(
		context: RsvpNotificationContext,
		t: NotificationT,
	): Promise<string> {
		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
			t,
		);

		const parts: string[] = [];
		parts.push(t("notif_msg_customer_no_show_intro"));
		parts.push(``);
		parts.push(
			`${t("notif_label_customer")}: ${context.customerName || context.customerEmail || t("notif_anonymous")}`,
		);
		if (context.facilityName) {
			parts.push(`${t("notif_label_facility")}: ${context.facilityName}`);
		}
		parts.push(`${t("notif_label_date_time")}: ${rsvpTimeFormatted}`);
		return parts.join("\n");
	}

	/**
	 * Handle unpaid order created event
	 * Notify: Customer (unpaid order created for reservation)
	 * Can notify logged-in customers (via onsite and email) or anonymous customers with name and phone (via onsite and SMS)
	 */
	private async handleUnpaidOrderCreated(context: RsvpNotificationContext) {
		// Check if we can notify: need customerId OR (name AND phone)
		const hasCustomerId = Boolean(context.customerId);
		const customerName = context.customerName || context.customerEmail;
		const customerPhone = context.customerPhone;
		const hasNameAndPhone = Boolean(customerName && customerPhone);

		if (!hasCustomerId && !hasNameAndPhone) {
			// Can't notify without customerId or name+phone
			logger.info(
				"Skipping unpaid order notification: no customerId or name+phone",
				{
					metadata: {
						rsvpId: context.rsvpId,
						hasCustomerId,
						hasName: Boolean(customerName),
						hasPhone: Boolean(customerPhone),
					},
					tags: ["rsvp", "notification", "skip"],
				},
			);
			return;
		}

		const t = getNotificationT(context.locale || "en");
		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
			t,
		);

		const subject = t("notif_subject_payment_required");

		// Build payment URL - use actionUrl if provided, otherwise default to reservation history
		// For anonymous users, include payment URL in the message for SMS
		const paymentUrl = context.actionUrl
			? context.actionUrl
			: hasCustomerId
				? `/s/${context.storeId}/reservation/history`
				: null; // For anonymous users, payment URL will be included in SMS message

		const message = await this.buildUnpaidOrderCreatedMessage(
			context,
			rsvpTimeFormatted,
			// Include payment URL in message only for anonymous users (SMS)
			hasCustomerId ? null : paymentUrl,
			t,
		);

		// For logged-in customers, use standard notification flow (onsite and email)
		if (hasCustomerId && context.customerId) {
			const channels = await this.getRsvpNotificationChannels(
				context.storeId,
				context.customerId,
			);

			await this.notificationService.createNotification({
				senderId: context.storeOwnerId || context.customerId || "",
				recipientId: context.customerId,
				storeId: context.storeId,
				subject,
				message,
				notificationType: "reservation",
				actionUrl: paymentUrl,
				priority: 1, // High priority for payment notifications
				channels,
			});
			return;
		}

		// For anonymous customers with name and phone, send SMS directly and create onsite notification
		// Since the notification system requires a recipientId, we'll use storeOwnerId as placeholder
		// for onsite notifications (store can see it), and send SMS directly to the phone number

		// Build SMS message - payment URL is already included in message for anonymous users
		const smsMessage = `${subject}\n\n${message}`;

		// Send SMS directly (bypassing notification system for anonymous users)
		if (customerPhone) {
			try {
				// Check if phone number is Taiwan or US format
				const normalizedPhone = customerPhone.trim();
				const isTaiwanNumber = /^\+?886/.test(normalizedPhone);
				const isUSNumber = /^\+?1/.test(normalizedPhone);

				//#region Send via Twilio SMS for US/Canada numbers
				const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
				if (!twilioPhoneNumber) {
					logger.error(
						"Failed to send SMS to anonymous customer: Twilio not configured",
						{
							metadata: {
								rsvpId: context.rsvpId,
								customerName,
								customerPhone: normalizedPhone.replace(/\d(?=\d{4})/g, "*"),
								storeId: context.storeId,
								error: "TWILIO_PHONE_NUMBER environment variable is required",
							},
							tags: ["rsvp", "notification", "sms", "anonymous", "error"],
						},
					);
				} else {
					try {
						const { twilioClient } = await import("@/lib/twilio/client");
						const message = await twilioClient.messages.create({
							body: smsMessage,
							from: twilioPhoneNumber,
							to: normalizedPhone,
						});

						logger.info(
							"Sent SMS to anonymous customer for unpaid order (Twilio)",
							{
								metadata: {
									rsvpId: context.rsvpId,
									customerName,
									customerPhone: normalizedPhone.replace(/\d(?=\d{4})/g, "*"),
									storeId: context.storeId,
									messageId: message.sid,
								},
								tags: ["rsvp", "notification", "sms", "anonymous", "twilio"],
							},
						);
					} catch (error) {
						logger.error("Failed to send SMS to anonymous customer (Twilio)", {
							metadata: {
								rsvpId: context.rsvpId,
								customerName,
								customerPhone: normalizedPhone.replace(/\d(?=\d{4})/g, "*"),
								storeId: context.storeId,
								error: error instanceof Error ? error.message : String(error),
							},
							tags: ["rsvp", "notification", "sms", "anonymous", "error"],
						});
					}
				}
				//#endregion

				/*
				if (isTaiwanNumber) {
					// Send via Mitake SMS for Taiwan numbers
					const { SmSend } = await import("@/lib/Mitake_SMS/sm-send");
					const result = await SmSend({
						phoneNumber: normalizedPhone,
						message: smsMessage,
					});

					if (result.success) {
						logger.info(
							"Sent SMS to anonymous customer for unpaid order (Mitake)",
							{
								metadata: {
									rsvpId: context.rsvpId,
									customerName,
									customerPhone: normalizedPhone.replace(/\d(?=\d{4})/g, "*"), // Mask phone
									storeId: context.storeId,
									messageId: result.messageId,
								},
								tags: ["rsvp", "notification", "sms", "anonymous", "mitake"],
							},
						);
					} else {
						logger.error("Failed to send SMS to anonymous customer (Mitake)", {
							metadata: {
								rsvpId: context.rsvpId,
								customerName,
								customerPhone: normalizedPhone.replace(/\d(?=\d{4})/g, "*"),
								storeId: context.storeId,
								error: result.error,
							},
							tags: ["rsvp", "notification", "sms", "anonymous", "error"],
						});
					}
				} else if (isUSNumber) {
					//#region Send via Twilio SMS for US/Canada numbers
					const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
					if (!twilioPhoneNumber) {
						logger.error(
							"Failed to send SMS to anonymous customer: Twilio not configured",
							{
								metadata: {
									rsvpId: context.rsvpId,
									customerName,
									customerPhone: normalizedPhone.replace(/\d(?=\d{4})/g, "*"),
									storeId: context.storeId,
									error: "TWILIO_PHONE_NUMBER environment variable is required",
								},
								tags: ["rsvp", "notification", "sms", "anonymous", "error"],
							},
						);
					} else {
						try {
							const { twilioClient } = await import("@/lib/twilio/client");
							const message = await twilioClient.messages.create({
								body: smsMessage,
								from: twilioPhoneNumber,
								to: normalizedPhone,
							});

							logger.info(
								"Sent SMS to anonymous customer for unpaid order (Twilio)",
								{
									metadata: {
										rsvpId: context.rsvpId,
										customerName,
										customerPhone: normalizedPhone.replace(/\d(?=\d{4})/g, "*"),
										storeId: context.storeId,
										messageId: message.sid,
									},
									tags: ["rsvp", "notification", "sms", "anonymous", "twilio"],
								},
							);
						} catch (error) {
							logger.error(
								"Failed to send SMS to anonymous customer (Twilio)",
								{
									metadata: {
										rsvpId: context.rsvpId,
										customerName,
										customerPhone: normalizedPhone.replace(/\d(?=\d{4})/g, "*"),
										storeId: context.storeId,
										error:
											error instanceof Error ? error.message : String(error),
									},
									tags: ["rsvp", "notification", "sms", "anonymous", "error"],
								},
							);
						}
					}
					//#endregion
				} else {
					logger.warn("Unsupported phone number format for SMS", {
						metadata: {
							rsvpId: context.rsvpId,
							customerPhone: normalizedPhone.replace(/\d(?=\d{4})/g, "*"),
							storeId: context.storeId,
						},
						tags: ["rsvp", "notification", "sms", "anonymous", "warning"],
					});
				} */
			} catch (error) {
				logger.error("Error sending SMS to anonymous customer", {
					metadata: {
						rsvpId: context.rsvpId,
						customerName,
						customerPhone: customerPhone.replace(/\d(?=\d{4})/g, "*"),
						storeId: context.storeId,
						error: error instanceof Error ? error.message : String(error),
					},
					tags: ["rsvp", "notification", "sms", "anonymous", "error"],
				});
			}
		}

		// For onsite notifications for anonymous users, create notification for store owner
		// This allows the store to see that an unpaid order was created for an anonymous customer
		// and they can follow up if needed
		if (context.storeOwnerId) {
			const storeNotificationMessage = `${t("notif_msg_unpaid_order_anonymous_intro")}\n\n${message}\n\n${t("notif_label_customer")}: ${customerName ?? ""}\n${t("notif_label_phone")}: ${customerPhone ? customerPhone.replace(/\d(?=\d{4})/g, "*") : t("notif_na")}`;
			try {
				const channels = await this.getRsvpNotificationChannels(
					context.storeId,
					context.storeOwnerId,
				);

				await this.notificationService.createNotification({
					senderId: context.storeOwnerId,
					recipientId: context.storeOwnerId,
					storeId: context.storeId,
					subject: t("notif_subject_unpaid_order", {
						customerName: customerName || t("notif_anonymous"),
					}),
					message: storeNotificationMessage,
					notificationType: "reservation",
					actionUrl: `/storeAdmin/${context.storeId}/rsvp`,
					priority: 1, // High priority
					channels,
				});
			} catch (error) {
				logger.warn("Failed to create onsite notification for store owner", {
					metadata: {
						rsvpId: context.rsvpId,
						storeId: context.storeId,
						storeOwnerId: context.storeOwnerId,
						error: error instanceof Error ? error.message : String(error),
					},
					tags: ["rsvp", "notification", "onsite", "anonymous", "warning"],
				});
			}
		}
	}

	private async buildUnpaidOrderCreatedMessage(
		context: RsvpNotificationContext,
		rsvpTimeFormatted: string,
		paymentUrl: string | null,
		t: NotificationT,
	): Promise<string> {
		const parts: string[] = [];
		parts.push(t("notif_msg_payment_required_intro"));
		parts.push(``);
		parts.push(
			`${t("notif_label_store")}: ${context.storeName || t("notif_store")}`,
		);
		if (context.facilityName) {
			parts.push(`${t("notif_label_facility")}: ${context.facilityName}`);
		}
		if (context.serviceStaffName) {
			parts.push(
				`${t("notif_label_service_staff")}: ${context.serviceStaffName}`,
			);
		}
		parts.push(`${t("notif_label_date_time")}: ${rsvpTimeFormatted}`);
		parts.push(
			t("notif_party_size", {
				adults: context.numOfAdult || 1,
				children: context.numOfChild || 0,
			}),
		);
		parts.push(``);
		parts.push(t("notif_msg_please_complete_payment"));
		// Include payment URL if provided (for SMS messages to anonymous users)
		if (paymentUrl) {
			parts.push(``);
			parts.push(`${t("notif_label_payment_link")}: ${paymentUrl}`);
		}
		return parts.join("\n");
	}

	/**
	 * Format RSVP time for display using standard i18n datetime format
	 * Format: {datetime_format} HH:mm (e.g., "yyyy/MM/dd HH:mm" for en, "yyyy年MM月dd日 HH:mm" for tw)
	 */
	/**
	 * Handle reminder notification
	 * Sends reminder to customer before reservation time
	 */
	async handleReminder(
		context: RsvpNotificationContext,
	): Promise<string | null> {
		try {
			logger.info("Sending RSVP reminder", {
				metadata: {
					rsvpId: context.rsvpId,
					storeId: context.storeId,
					customerId: context.customerId,
				},
				tags: ["rsvp", "notification", "reminder"],
			});

			// Get store information if not provided
			if (!context.storeName || !context.storeOwnerId) {
				const store = await sqlClient.store.findUnique({
					where: { id: context.storeId },
					select: {
						name: true,
						ownerId: true,
					},
				});

				if (store) {
					context.storeName = store.name;
					context.storeOwnerId = store.ownerId;
				}
			}

			// Get RSVP details
			const rsvp = await sqlClient.rsvp.findUnique({
				where: { id: context.rsvpId },
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
				},
			});

			if (!rsvp) {
				logger.warn("RSVP not found for reminder", {
					metadata: { rsvpId: context.rsvpId },
					tags: ["rsvp", "notification", "reminder"],
				});
				return null;
			}

			// Determine recipient
			const recipientId = context.customerId;
			if (!recipientId) {
				// Anonymous reservation - skip reminder (or send to store owner)
				logger.info("Skipping reminder for anonymous reservation", {
					metadata: {
						rsvpId: context.rsvpId,
						storeId: context.storeId,
					},
					tags: ["rsvp", "notification", "reminder", "anonymous"],
				});
				return null;
			}

			// Get notification channels based on store settings and user preferences
			const channels = await this.getRsvpNotificationChannels(
				context.storeId,
				recipientId,
			);

			if (channels.length === 0) {
				logger.info("No channels enabled for reminder", {
					metadata: {
						rsvpId: context.rsvpId,
						storeId: context.storeId,
						customerId: recipientId,
					},
					tags: ["rsvp", "notification", "reminder", "skip"],
				});
				return null;
			}

			// Get locale for i18n
			const locale = context.locale || "en";
			const t = getNotificationT(locale);

			// Build reminder message
			const subject = t("notif_subject_reminder", {
				storeName: context.storeName || t("notif_store"),
			});

			// Get service staff name from User relation
			const serviceStaffName =
				rsvp.ServiceStaff?.User?.name || rsvp.ServiceStaff?.User?.email || null;
			if (serviceStaffName) {
				context.serviceStaffName = serviceStaffName;
			}

			const message = await this.buildReminderMessage(
				{
					rsvpTime: rsvp.rsvpTime,
					numOfAdult: rsvp.numOfAdult,
					numOfChild: rsvp.numOfChild,
					message: rsvp.message,
					Facility: rsvp.Facility
						? { facilityName: rsvp.Facility.facilityName }
						: null,
					ServiceStaff: rsvp.ServiceStaff
						? { userId: rsvp.ServiceStaff.userId }
						: null,
				},
				context,
				t,
			);

			// Create action URL
			const actionUrl =
				context.actionUrl ||
				`/s/${context.storeId}/reservation/${context.rsvpId}`;

			// Send notification
			const notification = await this.notificationService.createNotification({
				senderId: context.storeOwnerId || "system",
				recipientId,
				storeId: context.storeId,
				subject,
				message,
				notificationType: "reservation",
				actionUrl,
				priority: 1, // High priority for reminders
				channels,
			});

			logger.info("RSVP reminder sent", {
				metadata: {
					rsvpId: context.rsvpId,
					storeId: context.storeId,
					customerId: context.customerId,
					notificationId: notification.id,
				},
				tags: ["rsvp", "notification", "reminder", "success"],
			});

			return notification.id;
		} catch (error) {
			logger.error("Failed to send RSVP reminder", {
				metadata: {
					rsvpId: context.rsvpId,
					storeId: context.storeId,
					customerId: context.customerId,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["rsvp", "notification", "reminder", "error"],
			});
			throw error;
		}
	}

	/**
	 * Build reminder message
	 */
	private async buildReminderMessage(
		rsvp: {
			rsvpTime: bigint;
			numOfAdult: number;
			numOfChild: number;
			message: string | null;
			Facility: { facilityName: string } | null;
			ServiceStaff: { userId: string } | null;
		},
		context: RsvpNotificationContext,
		t: NotificationT,
	): Promise<string> {
		const rsvpTimeFormatted = await this.formatRsvpTime(
			rsvp.rsvpTime,
			context.storeId,
			t,
		);

		const parts: string[] = [];
		parts.push(
			t("notif_msg_reminder_intro", {
				customerName: context.customerName || t("notif_anonymous"),
			}),
		);
		parts.push(``);
		parts.push(`${t("notif_label_reservation_time")}: ${rsvpTimeFormatted}`);

		if (rsvp.Facility) {
			parts.push(`${t("notif_label_facility")}: ${rsvp.Facility.facilityName}`);
		}

		if (rsvp.ServiceStaff && context.serviceStaffName) {
			parts.push(
				`${t("notif_label_service_staff")}: ${context.serviceStaffName}`,
			);
		}

		parts.push(
			`${t("notif_label_party_size")}: ${rsvp.numOfAdult} ${t("notif_adult")}`,
		);
		if (rsvp.numOfChild > 0) {
			parts.push(`, ${rsvp.numOfChild} ${t("notif_child")}`);
		}

		if (rsvp.message) {
			parts.push(``);
			parts.push(`${t("notif_label_message")}: ${rsvp.message}`);
		}

		parts.push(``);
		parts.push(t("notif_msg_reminder_footer"));

		return parts.join("\n");
	}

	private async formatRsvpTime(
		rsvpTime: bigint | null | undefined,
		storeId: string,
		t: NotificationT,
	): Promise<string> {
		if (!rsvpTime) {
			return t("notif_na");
		}

		try {
			// Get store timezone
			const store = await sqlClient.store.findUnique({
				where: { id: storeId },
				select: { defaultTimezone: true },
			});

			const timezone = store?.defaultTimezone || "Asia/Taipei";
			const date = epochToDate(rsvpTime);
			if (!date) {
				return t("notif_na");
			}

			// Get locale-specific datetime format (e.g., "yyyy/MM/dd" for en, "yyyy年MM月dd日" for tw)
			const datetimeFormat = t("datetime_format") || "yyyy-MM-dd";
			const offsetHours = getOffsetHours(timezone);
			const dateInTz = getDateInTz(date, offsetHours);
			return format(dateInTz, `${datetimeFormat} HH:mm`);
		} catch (error) {
			logger.warn("Failed to format RSVP time", {
				metadata: {
					rsvpTime: String(rsvpTime),
					storeId,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["rsvp", "notification", "format"],
			});
			return t("notif_na");
		}
	}
}

// Singleton instance
let routerInstance: RsvpNotificationRouter | null = null;

/**
 * Get the RSVP notification router instance
 */
export function getRsvpNotificationRouter(): RsvpNotificationRouter {
	if (!routerInstance) {
		routerInstance = new RsvpNotificationRouter();
	}
	return routerInstance;
}
