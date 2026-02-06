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
import type { NotificationChannel, NotificationPriority } from "./types";
import { MemberRole, RsvpStatus } from "@/types/enum";
import {
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import { format } from "date-fns";
import QRCode from "qrcode";
import { getBaseUrlForMail } from "@/lib/notification/email-template";
import type {
	LineReminderCardData,
	LineReservationCardData,
} from "@/lib/notification/channels/line-channel";

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
	/** Payment amount for created reservation (e.g. total cost). */
	paymentAmount?: number | null;
	/** Currency code for payment amount (e.g. "twd", "TWD"). */
	paymentCurrency?: string | null;
	actionUrl?: string | null;
	/** Order ID for unpaid-order-created; payment URL will be /checkout/{orderId}. */
	orderId?: string | null;
	/** Locale for notification subject/message (en, tw, jp). Defaults to "en". */
	locale?: "en" | "tw" | "jp";
}

/** Supported notification locales; used so each recipient gets message in their locale. */
export type NotificationLocale = "en" | "tw" | "jp";

/** Store staff roles that receive RSVP notifications (subset of MemberRole) */
const STORE_STAFF_ROLES: readonly (typeof MemberRole)[keyof typeof MemberRole][] =
	[MemberRole.owner, MemberRole.storeAdmin, MemberRole.staff];

/** Icon prefix for all staff notification subjects (reservation/clipboard) */
const STAFF_NOTIFICATION_SUBJECT_ICON = "📋 ";

type FlexEventRecipient = "staff" | "customer";

interface ReservationFlexKeys {
	tagKey: string;
	buttonKey: string;
	altKey: string;
}

/** Per-event LINE Flex keys (tag, button, alt). Returns null to use defaults
 * (no tag, default button). */
function getReservationFlexKeys(
	eventType: RsvpEventType,
	recipient: FlexEventRecipient,
	status?: number,
): ReservationFlexKeys | null {
	if (eventType === "status_changed") {
		if (status === RsvpStatus.ReadyToConfirm) {
			return recipient === "staff"
				? {
						tagKey: "line_flex_tag_payment_received",
						buttonKey: "line_flex_btn_confirm_reservation",
						altKey: "line_flex_alt_payment_received",
					}
				: {
						tagKey: "line_flex_tag_awaiting_confirmation",
						buttonKey: "line_flex_btn_view_reservation",
						altKey: "line_flex_alt_awaiting_confirmation",
					};
		}

		if (status === RsvpStatus.Ready) {
			return {
				tagKey: "line_flex_tag_ready",
				buttonKey: "line_flex_btn_check_in",
				altKey: "line_flex_alt_reservation_ready",
			};
		}

		if (status === RsvpStatus.CheckedIn) {
			return recipient === "staff"
				? {
						tagKey: "line_flex_tag_checked_in",
						buttonKey: "line_flex_btn_view_reservation",
						altKey: "line_flex_alt_customer_checked_in",
					}
				: {
						tagKey: "line_flex_tag_checked_in",
						buttonKey: "line_flex_btn_view_reservation",
						altKey: "line_flex_alt_you_checked_in",
					};
		}

		return null;
	}

	const both = (
		tag: string,
		btn: string,
		alt: string,
	): ReservationFlexKeys => ({
		tagKey: tag,
		buttonKey: btn,
		altKey: alt,
	});

	const map: Partial<
		Record<
			RsvpEventType,
			Partial<Record<FlexEventRecipient, ReservationFlexKeys>> & {
				both?: ReservationFlexKeys;
			}
		>
	> = {
		created: {
			staff: both(
				"line_flex_tag_updated",
				"line_flex_btn_view_reservation",
				"line_flex_alt_reservation_updated",
			),
		},
		updated: {
			both: both(
				"line_flex_tag_updated",
				"line_flex_btn_view_reservation",
				"line_flex_alt_reservation_updated",
			),
		},
		cancelled: {
			both: both(
				"line_flex_tag_cancelled",
				"line_flex_btn_view_history",
				"line_flex_alt_reservation_cancelled",
			),
		},
		deleted: {
			staff: both(
				"line_flex_tag_deleted",
				"line_flex_btn_view_history",
				"line_flex_alt_reservation_deleted",
			),
		},
		confirmed_by_store: {
			customer: both(
				"line_flex_tag_confirmed",
				"line_flex_btn_view_reservation",
				"line_flex_alt_reservation_confirmed",
			),
		},
		confirmed_by_customer: {
			staff: both(
				"line_flex_tag_customer_confirmed",
				"line_flex_btn_view_reservation",
				"line_flex_alt_customer_confirmed",
			),
		},
		payment_received: {
			staff: both(
				"line_flex_tag_payment_received",
				"line_flex_btn_view_reservation",
				"line_flex_alt_payment_received",
			),
		},
		ready: {
			customer: both(
				"line_flex_tag_ready",
				"line_flex_btn_check_in",
				"line_flex_alt_reservation_ready",
			),
		},
		completed: {
			customer: both(
				"line_flex_tag_completed",
				"line_flex_btn_view_history",
				"line_flex_alt_reservation_completed",
			),
		},
		no_show: {
			staff: both(
				"line_flex_tag_no_show",
				"line_flex_btn_view_history",
				"line_flex_alt_no_show",
			),
		},
		unpaid_order_created: {
			customer: both(
				"line_flex_tag_payment_required",
				"line_flex_btn_complete_payment",
				"line_flex_alt_payment_required",
			),
		},
		reminder: {
			staff: both(
				"line_flex_tag_reminder",
				"line_flex_btn_view_reservation",
				"line_flex_alt_reminder_staff",
			),
		},
	};
	const entry = map[eventType];
	if (!entry) return null;
	const keys = entry[recipient] ?? entry.both ?? null;
	return keys;
}

export class RsvpNotificationRouter {
	private notificationService: NotificationService;
	private preferenceManager: PreferenceManager;

	constructor() {
		this.notificationService = new NotificationService();
		this.preferenceManager = new PreferenceManager();
	}

	/**
	 * Get user IDs of store staff (owner, storeAdmin, staff) for the store's organization
	 * who should receive store notifications. Excludes service staff with receiveStoreNotifications false.
	 * Store owner is always included. Returns empty array if store or organization not found.
	 */
	private async getStoreStaffUserIds(storeId: string): Promise<string[]> {
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { organizationId: true, ownerId: true },
		});
		if (!store?.organizationId) {
			return store?.ownerId ? [store.ownerId] : [];
		}
		const members = await sqlClient.member.findMany({
			where: {
				organizationId: store.organizationId,
				role: { in: [...STORE_STAFF_ROLES] },
			},
			select: { userId: true },
		});
		let userIds = [...new Set(members.map((m) => m.userId))];
		if (userIds.length === 0 && store.ownerId) {
			userIds.push(store.ownerId);
		}
		const optedOut = await sqlClient.serviceStaff.findMany({
			where: {
				storeId,
				receiveStoreNotifications: false,
				isDeleted: false,
			},
			select: { userId: true },
		});
		const optedOutSet = new Set(optedOut.map((s) => s.userId));
		return userIds.filter((id) => id === store.ownerId || !optedOutSet.has(id));
	}

	/** Normalize User.locale to supported notification locale; default "en". */
	private static normalizeLocale(
		locale: string | null | undefined,
	): NotificationLocale {
		if (locale === "tw" || locale === "jp") return locale;
		return "en";
	}

	/**
	 * Get store staff user IDs with each recipient's locale for per-recipient localized messages.
	 */
	private async getStoreStaffWithLocales(
		storeId: string,
	): Promise<Array<{ userId: string; locale: NotificationLocale }>> {
		const userIds = await this.getStoreStaffUserIds(storeId);
		if (userIds.length === 0) return [];
		const users = await sqlClient.user.findMany({
			where: { id: { in: userIds } },
			select: { id: true, locale: true },
		});
		const localeByUserId = new Map(
			users.map((u) => [
				u.id,
				RsvpNotificationRouter.normalizeLocale(u.locale),
			]),
		);
		return userIds.map((userId) => ({
			userId,
			locale: localeByUserId.get(userId) ?? "en",
		}));
	}

	/**
	 * Get a user's preferred locale for notifications; default "en".
	 */
	private async getUserLocale(userId: string): Promise<NotificationLocale> {
		const user = await sqlClient.user.findUnique({
			where: { id: userId },
			select: { locale: true },
		});
		return RsvpNotificationRouter.normalizeLocale(user?.locale ?? null);
	}

	/**
	 * Send notification to all store staff; each recipient receives subject/message and LINE Flex in their locale.
	 * When lineFlexPayloadOrBuilder is provided, LINE channel uses payload type "reservation" (reservation Flex).
	 * Pass a function to build LINE Flex per staff so each receives the message in his/her locale.
	 */
	private async notifyStoreStaff(
		context: RsvpNotificationContext,
		buildMessage: (
			locale: NotificationLocale,
		) => Promise<{ subject: string; message: string }>,
		actionUrl: string,
		priority: NotificationPriority,
		lineFlexPayloadOrBuilder?:
			| string
			| null
			| ((
					locale: NotificationLocale,
					subjectForTag: string,
			  ) => Promise<string | null>),
	): Promise<void> {
		const staffWithLocales = await this.getStoreStaffWithLocales(
			context.storeId,
		);
		for (const { userId: recipientId, locale } of staffWithLocales) {
			try {
				const { subject, message } = await buildMessage(locale);
				const emailSubject = `${STAFF_NOTIFICATION_SUBJECT_ICON}${subject}`;

				const lineFlexPayload =
					typeof lineFlexPayloadOrBuilder === "function"
						? await lineFlexPayloadOrBuilder(locale, emailSubject)
						: lineFlexPayloadOrBuilder;

				const channels = await this.getRsvpNotificationChannels(
					context.storeId,
					recipientId,
				);

				await this.notificationService.createNotification({
					senderId: context.customerId || context.storeOwnerId || recipientId,
					recipientId,
					storeId: context.storeId,
					subject: `${STAFF_NOTIFICATION_SUBJECT_ICON}${subject}`,
					message,
					notificationType: "reservation",
					actionUrl,
					priority,
					channels,
					...(lineFlexPayload != null && lineFlexPayload !== ""
						? { lineFlexPayload }
						: {}),
				});
			} catch (err: unknown) {
				logger.warn("Failed to send RSVP notification to store staff", {
					metadata: {
						storeId: context.storeId,
						recipientId,
						rsvpId: context.rsvpId,
						error: err instanceof Error ? err.message : String(err),
					},
					tags: ["rsvp", "notification", "store-staff", "warning"],
				});
			}
		}
	}

	/**
	 * Get notification channels from store's and recipient's notification preferences.
	 * - Onsite: always included.
	 * - Email: included only if store default preferences (NotificationPreferences userId=null) have emailEnabled !== false, then filtered by user preferences.
	 * - Plugin channels: included if store has NotificationChannelConfig with enabled: true, then filtered by user preferences.
	 */
	private async getRsvpNotificationChannels(
		storeId: string,
		recipientId: string | null | undefined,
	): Promise<NotificationChannel[]> {
		const pluginChannels: NotificationChannel[] = [
			"line",
			"push",
			"sms",
			"telegram",
			"whatsapp",
			"wechat",
		];

		const [storeConfigs, storeDefaultPrefs, systemSettings] = await Promise.all(
			[
				sqlClient.notificationChannelConfig.findMany({
					where: {
						storeId,
						channel: { in: pluginChannels },
					},
					select: { channel: true, enabled: true },
				}),
				sqlClient.notificationPreferences.findFirst({
					where: { storeId, userId: null },
					select: { emailEnabled: true },
				}),
				sqlClient.systemNotificationSettings.findFirst({
					select: { emailEnabled: true },
				}),
			],
		);

		// Onsite always; email only when system allows and store default preferences allow (no record or emailEnabled !== false)
		const channels: NotificationChannel[] = ["onsite"];
		const systemEmailAllowed = systemSettings?.emailEnabled !== false;
		const storeDefaultEmailAllowed = storeDefaultPrefs?.emailEnabled !== false;
		if (systemEmailAllowed && storeDefaultEmailAllowed) {
			channels.push("email");
		}

		for (const ch of pluginChannels) {
			const config = storeConfigs.find((c) => c.channel === ch);
			if (config?.enabled) {
				channels.push(ch);
			}
		}

		let result = channels;
		if (recipientId) {
			result = await this.filterChannelsByRecipientPreferences(
				channels,
				recipientId,
				storeId,
			);
		}

		return result;
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
	 * Notify store staff about the new reservation
	 * Handle reservation created event
	 * Notify: Store staff (new reservation request)
	 */
	private async handleCreated(context: RsvpNotificationContext) {
		await this.notifyStoreStaff(
			context,
			async (locale) => {
				const t = getNotificationT(locale);
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
				return { subject, message };
			},
			context.actionUrl || `/storeAdmin/${context.storeId}/rsvp/history`,
			1,
			(locale, subjectForTag) =>
				this.buildReservationLineFlexPayload(context, locale, {
					eventType: "created",
					recipient: "staff",
					subjectForTag,
				}),
		);

		/* customer should not receive this notification
		// Notify customer that the reservation was created (LINE Flex payload type "reservation")
		if (context.customerId) {
			const locale =
				context.locale ?? (await this.getUserLocale(context.customerId));
			const t = getNotificationT(locale);
			const rsvpTimeFormatted = await this.formatRsvpTime(
				context.rsvpTime,
				context.storeId,
				t,
			);
			const subject = t("reservation_created");
			const message = this.buildCreatedMessage(context, rsvpTimeFormatted, t);
			const channels = await this.getRsvpNotificationChannels(
				context.storeId,
				context.customerId,
			);
			const customerLineFlexPayload =
				await this.buildReservationLineFlexPayload(context, locale, {
					eventType: "created",
					recipient: "customer",
				});
			await this.notificationService.createNotification({
				senderId: context.storeOwnerId ?? context.customerId,
				recipientId: context.customerId,
				storeId: context.storeId,
				subject,
				message,
				notificationType: "reservation",
				actionUrl: `/s/${context.storeId}/reservation/history`,
				lineFlexPayload: customerLineFlexPayload,
				priority: 1,
				channels,
			});
		}*/
	}

	/**
	 * Handle reservation updated event
	 * Notify: Store staff (reservation modified)
	 * Notify: Customer (if logged in)
	 */
	private async handleUpdated(context: RsvpNotificationContext) {
		await this.notifyStoreStaff(
			context,
			async (locale) => {
				const t = getNotificationT(locale);
				const rsvpTimeFormatted = await this.formatRsvpTime(
					context.rsvpTime,
					context.storeId,
					t,
				);
				const customerName =
					context.customerName || context.customerEmail || t("notif_anonymous");
				const subject = t("notif_subject_reservation_updated", {
					customerName,
				});
				const message = this.buildUpdatedMessage(context, rsvpTimeFormatted, t);
				return { subject, message };
			},
			context.actionUrl || `/storeAdmin/${context.storeId}/rsvp`,
			1,
			(locale, subjectForTag) =>
				this.buildReservationLineFlexPayload(context, locale, {
					eventType: "updated",
					recipient: "staff",
					subjectForTag,
				}),
		);

		// Notify customer (if logged in) in their locale
		if (context.customerId) {
			const locale =
				context.locale ?? (await this.getUserLocale(context.customerId));
			const t = getNotificationT(locale);
			const rsvpTimeFormatted = await this.formatRsvpTime(
				context.rsvpTime,
				context.storeId,
				t,
			);
			const customerSubject = t("notif_subject_your_reservation_updated");
			const customerMessage = this.buildUpdatedMessage(
				context,
				rsvpTimeFormatted,
				t,
			);
			const channels = await this.getRsvpNotificationChannels(
				context.storeId,
				context.customerId,
			);
			const customerLineFlexPayload =
				await this.buildReservationLineFlexPayload(context, locale, {
					eventType: "updated",
					recipient: "customer",
					subjectForTag: customerSubject,
				});
			await this.notificationService.createNotification({
				senderId: context.storeOwnerId || context.customerId,
				recipientId: context.customerId,
				storeId: context.storeId,
				subject: customerSubject,
				message: customerMessage,
				notificationType: "reservation",
				actionUrl: `/s/${context.storeId}/reservation/history`,
				lineFlexPayload: customerLineFlexPayload,
				priority: 1,
				channels,
			});
		}
	}

	/**
	 * Handle reservation cancelled event
	 * Notify: Store (reservation cancelled)
	 * Notify: Customer (if logged in or has contact info)
	 */
	private async handleCancelled(context: RsvpNotificationContext) {
		const locale =
			context.locale ??
			(context.customerId
				? await this.getUserLocale(context.customerId)
				: "en");
		const t = getNotificationT(locale);
		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
			t,
		);
		const customerName =
			context.customerName || context.customerEmail || t("notif_anonymous");

		// Notify store staff (each in their own locale)
		await this.notifyStoreStaff(
			context,
			async (staffLocale) => {
				const staffT = getNotificationT(staffLocale);
				const staffRsvpTimeFormatted = await this.formatRsvpTime(
					context.rsvpTime,
					context.storeId,
					staffT,
				);

				const subject = staffT("notif_subject_reservation_cancelled");
				const message = this.buildCancelledMessage(
					context,
					staffRsvpTimeFormatted,
					true,
					staffT,
				);
				return { subject, message };
			},
			context.actionUrl || `/storeAdmin/${context.storeId}/rsvp`,
			0,
			(locale, subjectForTag) =>
				this.buildReservationLineFlexPayload(context, locale, {
					eventType: "cancelled",
					recipient: "staff",
					subjectForTag,
				}),
		);

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
			const customerLineFlexPayload =
				await this.buildReservationLineFlexPayload(context, locale, {
					eventType: "cancelled",
					recipient: "customer",
					subjectForTag: customerSubject,
				});
			await this.notificationService.createNotification({
				senderId: context.storeOwnerId || context.customerId,
				recipientId: context.customerId,
				storeId: context.storeId,
				subject: customerSubject,
				message: customerMessage,
				notificationType: "reservation",
				actionUrl: `/s/${context.storeId}/reservation/history`,
				lineFlexPayload: customerLineFlexPayload,
				priority: 0,
				channels,
			});
		}
	}

	/**
	 * Handle reservation deleted event
	 * Notify: Store staff (reservation deleted)
	 */
	private async handleDeleted(context: RsvpNotificationContext) {
		await this.notifyStoreStaff(
			context,
			async (locale) => {
				const t = getNotificationT(locale);
				const customerName =
					context.customerName || context.customerEmail || t("notif_anonymous");
				const subject = t("notif_subject_reservation_deleted", {
					customerName,
				});
				const message = this.buildDeletedMessage(context, t);
				return { subject, message };
			},
			context.actionUrl || `/storeAdmin/${context.storeId}/rsvp`,
			0,
			(locale, subjectForTag) =>
				this.buildReservationLineFlexPayload(context, locale, {
					eventType: "deleted",
					recipient: "staff",
					subjectForTag,
				}),
		);
	}

	/**
	 * Handle store confirmation event
	 * Notify: Customer (reservation confirmed by store)
	 */
	private async handleConfirmedByStore(context: RsvpNotificationContext) {
		if (!context.customerId) {
			return; // Can't notify anonymous customers
		}

		const locale =
			context.locale ?? (await this.getUserLocale(context.customerId));
		const t = getNotificationT(locale);
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
		const lineFlexPayload = await this.buildReservationLineFlexPayload(
			context,
			locale,
			{
				eventType: "confirmed_by_store",
				recipient: "customer",
				subjectForTag: subject,
			},
		);
		await this.notificationService.createNotification({
			senderId: context.storeOwnerId || context.customerId,
			recipientId: context.customerId,
			storeId: context.storeId,
			subject,
			message,
			notificationType: "reservation",
			actionUrl: `/s/${context.storeId}/reservation/history`,
			lineFlexPayload,
			priority: 1,
			channels,
		});
	}

	/**
	 * Handle customer confirmation event
	 * Notify: Store staff (customer confirmed reservation)
	 */
	private async handleConfirmedByCustomer(context: RsvpNotificationContext) {
		await this.notifyStoreStaff(
			context,
			async (locale) => {
				const t = getNotificationT(locale);
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
					false,
					t,
				);
				return { subject, message };
			},
			context.actionUrl || `/storeAdmin/${context.storeId}/rsvp`,
			0,
			(locale, subjectForTag) =>
				this.buildReservationLineFlexPayload(context, locale, {
					eventType: "confirmed_by_customer",
					recipient: "staff",
					subjectForTag,
				}),
		);
	}

	/**
	 * Handle status changed event
	 * Notify based on status transition (store staff and/or customer)
	 */
	private async handleStatusChanged(context: RsvpNotificationContext) {
		if (!context.status || context.previousStatus === undefined) {
			return;
		}

		const previousStatus = context.previousStatus;
		const status = context.status;

		const customerLocale =
			context.locale ??
			(context.customerId
				? await this.getUserLocale(context.customerId)
				: "en");
		const t = getNotificationT(customerLocale);

		if (status === RsvpStatus.ReadyToConfirm) {
			// Notify store staff when reservation is ready to confirm (each in their locale)
			await this.notifyStoreStaff(
				context,
				async (locale) => {
					const staffT = getNotificationT(locale);
					const customerName =
						context.customerName ||
						context.customerEmail ||
						staffT("notif_anonymous");
					const subject = staffT("notif_subject_reservation_ready_to_confirm", {
						customerName,
					});
					const message = await this.buildStatusChangedMessage(
						context,
						previousStatus,
						status,
						staffT,
					);
					return { subject, message };
				},
				context.actionUrl || `/storeAdmin/${context.storeId}/rsvp`,
				1,
				(locale, subjectForTag) =>
					this.buildReservationLineFlexPayload(context, locale, {
						eventType: "status_changed",
						recipient: "staff",
						status: RsvpStatus.ReadyToConfirm,
						subjectForTag,
					}),
			);
			// ReadyToConfirm: staff only (no customer notification)
		} else if (status === RsvpStatus.Ready) {
			// Notify customer when reservation is ready (in customer's locale)
			if (context.customerId) {
				const subject = t("notif_subject_your_reservation_ready");
				let message = await this.buildStatusChangedMessage(
					context,
					previousStatus,
					status,
					t,
				);
				//message += `\n\n${this.buildCheckInMessageFooter(context.storeId, context.rsvpId, t)}`;

				const channels = await this.getRsvpNotificationChannels(
					context.storeId,
					context.customerId,
				);

				const htmlBodyFooter = await this.buildCheckInHtmlFooter(
					context.storeId,
					context.rsvpId,
					t,
				);

				const lineFlexPayload = await this.buildReservationLineFlexPayload(
					context,
					context.locale ?? customerLocale,
					{
						eventType: "status_changed",
						recipient: "customer",
						status: RsvpStatus.Ready,
						subjectForTag: subject,
					},
				);

				await this.notificationService.createNotification({
					senderId: context.storeOwnerId || context.customerId,
					recipientId: context.customerId,
					storeId: context.storeId,
					subject,
					message,
					notificationType: "reservation",
					actionUrl: `/s/${context.storeId}/reservation/history`,
					htmlBodyFooter,
					lineFlexPayload,
					priority: 1,
					channels,
				});
			}
		} else if (status === RsvpStatus.CheckedIn) {
			// Notify store staff: customer has arrived (each in their locale)
			await this.notifyStoreStaff(
				context,
				async (locale) => {
					const staffT = getNotificationT(locale);
					const customerName =
						context.customerName ||
						context.customerEmail ||
						staffT("notif_anonymous");
					const subject = staffT("notif_subject_customer_checked_in", {
						customerName,
					});
					const message = await this.buildStatusChangedMessage(
						context,
						previousStatus,
						status,
						staffT,
					);
					return { subject, message };
				},
				context.actionUrl || `/storeAdmin/${context.storeId}/rsvp`,
				1,
				(locale, subjectForTag) =>
					this.buildReservationLineFlexPayload(context, locale, {
						eventType: "status_changed",
						recipient: "staff",
						status: RsvpStatus.CheckedIn,
						subjectForTag,
					}),
			);

			// Notify customer: you're checked in (in customer's locale)
			if (context.customerId) {
				const customerSubject = t("notif_subject_your_reservation_checked_in");
				const customerMessage = await this.buildStatusChangedMessage(
					context,
					previousStatus,
					status,
					t,
				);
				const channels = await this.getRsvpNotificationChannels(
					context.storeId,
					context.customerId,
				);
				const customerLineFlexPayload =
					await this.buildReservationLineFlexPayload(
						context,
						context.locale ?? customerLocale,
						{
							eventType: "status_changed",
							recipient: "customer",
							status: RsvpStatus.CheckedIn,
							subjectForTag: customerSubject,
						},
					);
				await this.notificationService.createNotification({
					senderId: context.storeOwnerId || context.customerId,
					recipientId: context.customerId,
					storeId: context.storeId,
					subject: customerSubject,
					message: customerMessage,
					notificationType: "reservation",
					actionUrl: `/s/${context.storeId}/reservation/history`,
					lineFlexPayload: customerLineFlexPayload,
					priority: 1,
					channels,
				});
			}
		}
	}

	/**
	 * Handle payment received event
	 * Notify: Store staff (payment received for reservation)
	 */
	private async handlePaymentReceived(context: RsvpNotificationContext) {
		await this.notifyStoreStaff(
			context,
			async (locale) => {
				const t = getNotificationT(locale);
				const customerName =
					context.customerName || context.customerEmail || t("notif_anonymous");
				const subject = t("notif_subject_payment_received_for_reservation", {
					customerName,
				});
				const message = await this.buildPaymentReceivedMessage(context, t);
				return { subject, message };
			},
			context.actionUrl || `/storeAdmin/${context.storeId}/rsvp/history`,
			1,
			(locale, subjectForTag) =>
				this.buildReservationLineFlexPayload(context, locale, {
					eventType: "payment_received",
					recipient: "staff",
					subjectForTag,
				}),
		);
	}

	/**
	 * Handle ready event
	 * Notify: Customer (reservation is ready)
	 */
	private async handleReady(context: RsvpNotificationContext) {
		if (!context.customerId) {
			return;
		}

		const locale =
			context.locale ?? (await this.getUserLocale(context.customerId));
		const t = getNotificationT(locale);
		const subject = t("notif_subject_your_reservation_ready");
		let message = await this.buildReadyMessage(context, t);
		//message += `\n\n${this.buildCheckInMessageFooter(context.storeId, context.rsvpId, t)}`;

		const channels = await this.getRsvpNotificationChannels(
			context.storeId,
			context.customerId,
		);

		const htmlBodyFooter = await this.buildCheckInHtmlFooter(
			context.storeId,
			context.rsvpId,
			t,
		);

		const lineFlexPayload = await this.buildReservationLineFlexPayload(
			context,
			locale,
			{
				eventType: "ready",
				recipient: "customer",
				subjectForTag: subject,
			},
		);

		await this.notificationService.createNotification({
			senderId: context.storeOwnerId || context.customerId,
			recipientId: context.customerId,
			storeId: context.storeId,
			subject,
			message,
			notificationType: "reservation",
			actionUrl: `/s/${context.storeId}/reservation/history`,
			htmlBodyFooter,
			lineFlexPayload,
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

		const locale =
			context.locale ?? (await this.getUserLocale(context.customerId));
		const t = getNotificationT(locale);
		const subject = t("notif_subject_your_reservation_completed");
		const message = await this.buildCompletedMessage(context, t);

		const channels = await this.getRsvpNotificationChannels(
			context.storeId,
			context.customerId,
		);
		const lineFlexPayload = await this.buildReservationLineFlexPayload(
			context,
			locale,
			{
				eventType: "completed",
				recipient: "customer",
				subjectForTag: subject,
			},
		);
		await this.notificationService.createNotification({
			senderId: context.storeOwnerId || context.customerId,
			recipientId: context.customerId,
			storeId: context.storeId,
			subject,
			message,
			notificationType: "reservation",
			actionUrl: `/s/${context.storeId}/reservation/history`,
			lineFlexPayload,
			priority: 0,
			channels,
		});
	}

	/**
	 * Handle no-show event
	 * Notify: Store staff (customer no-show)
	 */
	private async handleNoShow(context: RsvpNotificationContext) {
		await this.notifyStoreStaff(
			context,
			async (locale) => {
				const t = getNotificationT(locale);
				const customerName =
					context.customerName || context.customerEmail || t("notif_anonymous");
				const subject = t("notif_subject_no_show", { customerName });
				const message = await this.buildNoShowMessage(context, t);
				return { subject, message };
			},
			context.actionUrl || `/storeAdmin/${context.storeId}/rsvp`,
			0,
			(locale, subjectForTag) =>
				this.buildReservationLineFlexPayload(context, locale, {
					eventType: "no_show",
					recipient: "staff",
					subjectForTag,
				}),
		);
	}

	/**
	 * Customer-facing check-in URL for this reservation (used in LINE/email when RSVP is ready).
	 * Always uses /s/{storeId}/checkin (never /storeAdmin/...).
	 */
	private getCheckInUrl(storeId: string, rsvpId: string): string {
		const base = getBaseUrlForMail().replace(/\/$/, "");
		return `${base}/s/${storeId}/checkin?rsvpId=${encodeURIComponent(rsvpId)}`;
	}

	/**
	 * Footer line for customer notifications: "Check-in when you arrive: [URL]".
	 * Include in notifications when RSVP is paid (ReadyToConfirm, Ready) or in reminder.
	 */
	private buildCheckInMessageFooter(
		storeId: string,
		rsvpId: string,
		t: NotificationT,
	): string {
		const url = this.getCheckInUrl(storeId, rsvpId);
		const label = t("notif_msg_checkin_when_you_arrive");
		return `${label}: ${url}`;
	}

	/**
	 * HTML footer for email: check-in QR code image and caption.
	 * Used in ready notifications so the customer can scan to check in.
	 */
	private async buildCheckInHtmlFooter(
		storeId: string,
		rsvpId: string,
		t: NotificationT,
	): Promise<string> {
		const url = this.getCheckInUrl(storeId, rsvpId);
		const labelRaw = t("notif_msg_checkin_when_you_arrive");
		const labelEsc = labelRaw
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
		let dataUrl: string;
		try {
			dataUrl = await QRCode.toDataURL(url, {
				width: 200,
				margin: 2,
				color: { dark: "#000000", light: "#ffffff" },
			});
		} catch (err) {
			logger.warn("Failed to generate check-in QR code", {
				metadata: {
					storeId,
					rsvpId,
					error: err instanceof Error ? err.message : String(err),
				},
				tags: ["notification", "qr", "ready"],
			});
			const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=2&data=${encodeURIComponent(url)}`;
			const urlEsc = url
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;");
			return `<div style="margin-top:24px;">
  <p style="font-size:14px;color:#374151;margin-bottom:8px;">${labelEsc}</p>
  <a href="${urlEsc}" target="_blank" rel="noopener noreferrer"><img src="${qrApiUrl}" alt="${labelEsc}" width="200" height="200" style="display:inline-block;" /></a>
</div>`;
		}
		const urlEsc = url
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
		return `<div style="margin-top:24px;">
  <p style="font-size:14px;color:#374151;margin-bottom:8px;">${labelEsc}</p>
  <a href="${urlEsc}" target="_blank" rel="noopener noreferrer"><img src="${dataUrl}" alt="${labelEsc}" width="200" height="200" style="display:inline-block;" /></a>
</div>`;
	}

	// Message builders

	// this create a message to store staff about the newly paid and ready reservation
	private buildCreatedMessage(
		context: RsvpNotificationContext,
		rsvpTimeFormatted: string,
		t: NotificationT,
	): string {
		const parts: string[] = [];
		//parts.push(t("notif_msg_new_reservation_intro")); //收到新的預約請求：
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
		if (context.paymentAmount != null && context.paymentAmount > 0) {
			const currency = (context.paymentCurrency ?? "TWD").toUpperCase();
			parts.push(
				`${t("notif_label_payment_amount")}: ${context.paymentAmount} ${currency}`,
			);
		}
		if (context.message) {
			parts.push(`${t("notif_label_message")}: ${context.message}`);
		}
		return parts.join("\n");
	}

	/**
	 * Build LINE reservation Flex card data from RSVP context (for payload type "reservation").
	 * When options provided, sets tagLabel and bookAgainLabel from per-event i18n keys.
	 */
	private async buildLineReservationCardData(
		context: RsvpNotificationContext,
		t: NotificationT,
		options?: {
			eventType: RsvpEventType;
			recipient: FlexEventRecipient;
			status?: number;
			/** When set, used as card tagLabel so LINE tag matches email subject. */
			subjectForTag?: string;
		},
	): Promise<LineReservationCardData> {
		const { dateStr, timeStr } = await this.formatRsvpDateAndTime(
			context.rsvpTime ?? null,
			context.storeId,
			t,
		);

		const partySizeStr = t("rsvp_num_of_guest_val", {
			adult: context.numOfAdult ?? 0,
			child: context.numOfChild ?? 0,
		});

		const flexKeys = options
			? getReservationFlexKeys(
					options.eventType,
					options.recipient,
					options.status ?? context.status ?? undefined,
				)
			: null;

		const recipient = options?.recipient ?? "customer";

		// Use email subject as tag when provided so LINE card tag matches email subject
		const tagLabel =
			options?.subjectForTag ??
			(flexKeys ? t(flexKeys.tagKey) : undefined) ??
			(recipient === "staff" ? t("line_flex_tag_updated") : undefined);

		return {
			storeName: context.storeName ?? t("notif_store"),
			storeAddress: undefined,
			heroImageUrl: undefined,
			tagLabel,
			reservationName:
				context.customerName ?? context.customerEmail ?? t("notif_anonymous"),
			diningDate: dateStr,
			diningTime: timeStr,
			partySize: partySizeStr,
			facilityName: context.facilityName ?? undefined,
			bookAgainLabel: flexKeys ? t(flexKeys.buttonKey) : undefined,
			// Staff do not get the footer "book again" / action button
			showFooterButton: recipient !== "staff",
		};
	}

	/**
	 * Build LINE Flex payload JSON string for reservation card (type "reservation").
	 * Uses the given locale for card labels. When options provided, includes per-event altText.
	 */
	private async buildReservationLineFlexPayload(
		context: RsvpNotificationContext,
		locale: string,
		options?: {
			eventType: RsvpEventType;
			recipient: FlexEventRecipient;
			status?: number;
			/** When set, used as card tagLabel so LINE tag matches email subject. */
			subjectForTag?: string;
		},
	): Promise<string> {
		const t = getNotificationT(locale as NotificationLocale);
		const card = await this.buildLineReservationCardData(context, t, options);
		const flexKeys = options
			? getReservationFlexKeys(
					options.eventType,
					options.recipient,
					options.status ?? context.status ?? undefined,
				)
			: null;
		const altText = flexKeys ? t(flexKeys.altKey) : undefined;

		const isCustomerReady =
			options?.recipient === "customer" &&
			(options?.eventType === "ready" ||
				(options?.eventType === "status_changed" &&
					(options?.status === RsvpStatus.Ready ||
						context.status === RsvpStatus.Ready)));

		const checkInUrl = isCustomerReady
			? this.getCheckInUrl(context.storeId, context.rsvpId)
			: undefined;

		return JSON.stringify({
			type: "reservation",
			data: card,
			...(altText != null && altText !== "" ? { altText } : {}),
			...(checkInUrl != null ? { checkInUrl } : {}),
		});
	}

	// this create a message to store staff about the reservation updated
	private buildUpdatedMessage(
		context: RsvpNotificationContext,
		rsvpTimeFormatted: string,
		t: NotificationT,
	): string {
		const parts: string[] = [];
		//parts.push(t("notif_msg_reservation_updated_intro"));
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

	// this create a message to store staff about the reservation cancelled
	private buildCancelledMessage(
		context: RsvpNotificationContext,
		rsvpTimeFormatted: string,
		isStore: boolean,
		t: NotificationT,
	): string {
		const parts: string[] = [];
		if (isStore) {
			//parts.push(t("notif_msg_reservation_cancelled_intro"));	//預約已取消：
			parts.push(
				`${t("notif_label_customer")}: ${context.customerName || context.customerEmail || t("notif_anonymous")}`,
			);
		} else {
			parts.push(t("notif_msg_your_reservation_cancelled_intro"));
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
		//parts.push(t("notif_msg_reservation_deleted_intro"));	//預約已刪除：
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
			//parts.push(t("notif_msg_your_reservation_confirmed_by_store_intro"));	//店家已確認您的預約：
			parts.push(
				`${t("notif_label_store")}: ${context.storeName || t("notif_store")}`,
			);
		} else {
			//parts.push(t("notif_msg_customer_confirmed_intro"));	//客戶已確認預約：
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
		[RsvpStatus.CheckedIn]: "notif_status_CheckedIn",
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
		//parts.push(t("notif_msg_reservation_status_changed_intro")); //預約狀態已變更：
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
		//parts.push(t("notif_msg_payment_received_intro")); //已收到預約付款：
		parts.push(
			`${t("notif_label_customer")}: ${context.customerName || context.customerEmail || t("notif_anonymous")}`,
		);
		if (context.facilityName) {
			parts.push(`${t("notif_label_facility")}: ${context.facilityName}`);
		}
		parts.push(`${t("notif_label_date_time")}: ${rsvpTimeFormatted}`);
		if (context.paymentAmount != null && context.paymentAmount > 0) {
			const currency = (context.paymentCurrency ?? "TWD").toUpperCase();
			parts.push(
				`${t("notif_label_payment_amount")}: ${context.paymentAmount} ${currency}`,
			);
		}

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
		//parts.push(t("notif_msg_your_reservation_ready_intro")); //您的預約已就緒：
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
		//parts.push(t("notif_msg_your_reservation_completed_intro")); //您的預約已完成：
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
		//parts.push(t("notif_msg_customer_no_show_intro")); //預約未到：
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
	 * Can notify logged-in customers (via onsite and email) or anonymous customers with name and
	 * phone (via onsite and SMS)
	 *
	 * triggered when store staff creates a reservation for cutsomer
	 */
	private async handleUnpaidOrderCreated(context: RsvpNotificationContext) {
		// Check if we can notify: need customerId OR (name AND phone)
		const hasCustomerId = Boolean(context.customerId);
		const customerName = context.customerName || context.customerEmail;
		const customerPhone = context.customerPhone;
		const hasNameAndPhone = Boolean(customerName && customerPhone);

		if (!hasCustomerId && !hasNameAndPhone) {
			// Can't notify without customerId or name+phone. this should not happen.
			logger.warn(
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

		// Use customer's locale when we have customerId; otherwise context.locale or "en"
		const locale =
			hasCustomerId && context.customerId
				? (context.locale ?? (await this.getUserLocale(context.customerId)))
				: context.locale || "en";
		const t = getNotificationT(locale);
		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
			t,
		);

		const subject = t("notif_subject_payment_required");

		// Build payment URL - /checkout/{orderId} when orderId present, else actionUrl or reservation history
		// For anonymous users, include payment URL in the message for SMS
		const paymentUrl =
			context.orderId != null && context.orderId !== ""
				? `/checkout/${context.orderId}`
				: context.actionUrl
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

		// For logged-in customers, use standard notification flow (onsite and email) in their locale
		if (hasCustomerId && context.customerId) {
			const channels = await this.getRsvpNotificationChannels(
				context.storeId,
				context.customerId,
			);
			const lineFlexPayload = await this.buildReservationLineFlexPayload(
				context,
				locale,
				{
					eventType: "unpaid_order_created",
					recipient: "customer",
					subjectForTag: subject,
				},
			);
			await this.notificationService.createNotification({
				senderId: context.storeOwnerId || context.customerId || "",
				recipientId: context.customerId,
				storeId: context.storeId,
				subject,
				message,
				notificationType: "reservation",
				actionUrl: paymentUrl,
				lineFlexPayload,
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

		/*
		// For onsite notifications for anonymous users, create notification for store owner in their locale
		// This allows the store to see that an unpaid order was created for an anonymous customer
		if (context.storeOwnerId) {
			const storeOwnerLocale = await this.getUserLocale(context.storeOwnerId);
			const storeT = getNotificationT(storeOwnerLocale);
			const storeRsvpTimeFormatted = await this.formatRsvpTime(
				context.rsvpTime,
				context.storeId,
				storeT,
			);
			const storeMessage = await this.buildUnpaidOrderCreatedMessage(
				context,
				storeRsvpTimeFormatted,
				null,
				storeT,
			);
			const storeNotificationMessage = `${storeT("notif_msg_unpaid_order_anonymous_intro")}\n\n${storeMessage}\n\n${storeT("notif_label_customer")}: ${customerName ?? ""}\n${storeT("notif_label_phone")}: ${customerPhone ? customerPhone.replace(/\d(?=\d{4})/g, "*") : storeT("notif_na")}`;
			try {
				const channels = await this.getRsvpNotificationChannels(
					context.storeId,
					context.storeOwnerId,
				);

				await this.notificationService.createNotification({
					senderId: context.storeOwnerId,
					recipientId: context.storeOwnerId,
					storeId: context.storeId,
					subject: `${STAFF_NOTIFICATION_SUBJECT_ICON}${storeT(
						"notif_subject_unpaid_order",
						{
							customerName: customerName || storeT("notif_anonymous"),
						},
					)}`,
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
			*/
	}

	//
	private async buildUnpaidOrderCreatedMessage(
		context: RsvpNotificationContext,
		rsvpTimeFormatted: string,
		paymentUrl: string | null,
		t: NotificationT,
	): Promise<string> {
		const parts: string[] = [];
		//parts.push(t("notif_msg_payment_required_intro"));	//預約付款：

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
		parts.push(t("notif_msg_please_complete_payment"));

		// Include payment URL if provided (for SMS messages to anonymous users)
		if (paymentUrl) {
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

			// Use recipient's locale so reminder is in their language
			const locale = context.locale ?? (await this.getUserLocale(recipientId));
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
			// Enrich context from rsvp for LINE Flex reservation card (staff notification)
			context.rsvpTime = context.rsvpTime ?? rsvp.rsvpTime;
			context.numOfAdult = context.numOfAdult ?? rsvp.numOfAdult;
			context.numOfChild = context.numOfChild ?? rsvp.numOfChild;
			context.facilityName =
				context.facilityName ?? rsvp.Facility?.facilityName ?? null;

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

			// Build LINE reminder Flex payload (訂位將至提醒 style)
			const { dateStr, timeStr } = await this.formatRsvpDateAndTime(
				rsvp.rsvpTime,
				context.storeId,
				t,
			);
			const partySizeStr = t("rsvp_num_of_guest_val", {
				adult: rsvp.numOfAdult,
				child: rsvp.numOfChild,
			});
			const reminderCard: LineReminderCardData = {
				title: t("line_flex_reminder_title"),
				messageBody: `${t("notif_msg_reminder_intro", {
					customerName: context.customerName || t("notif_anonymous"),
				})}\n\n${t("notif_msg_reminder_footer")}`,
				storeName: context.storeName || t("notif_store"),
				reservationName: context.customerName || t("notif_anonymous"),
				reservationDate: dateStr,
				reservationTime: timeStr,
				partySize: partySizeStr,
				notes: rsvp.message?.trim() || t("notif_msg_reminder_footer"),
				buttonLabel: t("line_flex_btn_view_invitation"),
			};
			const lineFlexPayload = JSON.stringify({
				type: "reminder",
				data: reminderCard,
			});

			// Send notification
			const notification = await this.notificationService.createNotification({
				senderId: context.storeOwnerId || "system",
				recipientId,
				storeId: context.storeId,
				subject,
				message,
				notificationType: "reservation",
				actionUrl,
				lineFlexPayload,
				priority: 1, // High priority for reminders
				channels,
			});

			logger.info("RSVP reminder sent to customer", {
				metadata: {
					rsvpId: context.rsvpId,
					storeId: context.storeId,
					customerId: context.customerId,
					notificationId: notification.id,
				},
				tags: ["rsvp", "notification", "reminder", "success"],
			});

			// Send reminder to staff: assigned staff if any, otherwise all store staff with receiveStoreNotifications
			let staffToNotify: { userId: string }[] = [];
			if (rsvp.ServiceStaff && rsvp.ServiceStaff.receiveStoreNotifications) {
				staffToNotify = [{ userId: rsvp.ServiceStaff.userId }];
			} else {
				const storeStaff = await sqlClient.serviceStaff.findMany({
					where: {
						storeId: context.storeId,
						receiveStoreNotifications: true,
						isDeleted: false,
					},
					select: { userId: true },
				});
				staffToNotify = storeStaff;
			}

			for (const staff of staffToNotify) {
				const staffChannels = await this.getRsvpNotificationChannels(
					context.storeId,
					staff.userId,
				);
				if (staffChannels.length > 0) {
					const staffLocale =
						context.locale ?? (await this.getUserLocale(staff.userId));
					const staffT = getNotificationT(staffLocale);
					const rsvpTimeFormatted = await this.formatRsvpTime(
						rsvp.rsvpTime,
						context.storeId,
						staffT,
					);
					const staffSubject = staffT("notif_subject_reminder_staff", {
						customerName: context.customerName || staffT("notif_anonymous"),
						rsvpTime: rsvpTimeFormatted,
					});
					const staffMessage = await this.buildReminderMessageForStaff(
						{
							rsvpTime: rsvp.rsvpTime,
							numOfAdult: rsvp.numOfAdult,
							numOfChild: rsvp.numOfChild,
							message: rsvp.message,
							Facility: rsvp.Facility
								? { facilityName: rsvp.Facility.facilityName }
								: null,
						},
						context,
						staffT,
					);
					const staffLineFlexPayload =
						await this.buildReservationLineFlexPayload(
							context,
							staffLocale as NotificationLocale,
							{ eventType: "reminder", recipient: "staff" },
						);
					await this.notificationService.createNotification({
						senderId: context.storeOwnerId || "system",
						recipientId: staff.userId,
						storeId: context.storeId,
						subject: staffSubject,
						message: staffMessage,
						notificationType: "reservation",
						actionUrl,
						lineFlexPayload: staffLineFlexPayload,
						priority: 1,
						channels: staffChannels,
					});
				}
			}

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
			`${t("notif_label_party_size")}: ${t("rsvp_num_of_guest_val", {
				adult: rsvp.numOfAdult,
				child: rsvp.numOfChild,
			})}`,
		);

		if (rsvp.message) {
			parts.push(`${t("notif_label_message")}: ${rsvp.message}`);
		}

		parts.push(t("notif_msg_reminder_footer"));
		/*
		parts.push(
			this.buildCheckInMessageFooter(context.storeId, context.rsvpId, t),
		);
		*/

		return parts.join("\n");
	}

	/**
	 * Build reminder message for service staff (assigned or store staff)
	 * Does not include service staff line since we're sending to staff
	 */
	private async buildReminderMessageForStaff(
		rsvp: {
			rsvpTime: bigint;
			numOfAdult: number;
			numOfChild: number;
			message: string | null;
			Facility: { facilityName: string } | null;
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
			t("notif_msg_reminder_staff_intro", {
				customerName: context.customerName || t("notif_anonymous"),
			}),
		);
		parts.push(`${t("notif_label_reservation_time")}: ${rsvpTimeFormatted}`);

		if (rsvp.Facility) {
			parts.push(`${t("notif_label_facility")}: ${rsvp.Facility.facilityName}`);
		}

		parts.push(
			`${t("notif_label_party_size")}: ${t("rsvp_num_of_guest_val", {
				adult: rsvp.numOfAdult,
				child: rsvp.numOfChild,
			})}`,
		);

		if (rsvp.message) {
			parts.push(`${t("notif_label_message")}: ${rsvp.message}`);
		}

		parts.push(t("notif_msg_reminder_staff_footer"));

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

	/**
	 * Format RSVP time as separate date and time strings for LINE reminder Flex (訂位日期 / 訂位時間).
	 */
	private async formatRsvpDateAndTime(
		rsvpTime: bigint | null | undefined,
		storeId: string,
		t: NotificationT,
	): Promise<{ dateStr: string; timeStr: string }> {
		const full = await this.formatRsvpTime(rsvpTime, storeId, t);
		if (full === t("notif_na")) {
			return { dateStr: full, timeStr: full };
		}
		const lastSpace = full.lastIndexOf(" ");
		if (lastSpace === -1) {
			return { dateStr: full, timeStr: "—" };
		}
		return {
			dateStr: full.slice(0, lastSpace),
			timeStr: full.slice(lastSpace + 1),
		};
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
