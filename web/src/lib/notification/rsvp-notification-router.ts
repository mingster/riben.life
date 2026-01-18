/**
 * RSVP Notification Router
 * Centralized router for sending notifications related to RSVP transactions
 * All store RSVP transactions should call this router, which sends notifications
 * to customers or stores according to business logic.
 */

import { sqlClient } from "@/lib/prismadb";
import { NotificationService } from "./notification-service";
import logger from "@/lib/logger";
import { RsvpStatus } from "@/types/enum";
import {
	epochToDate,
	getDateInTz,
	getTimezoneOffsetForDate,
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
	| "unpaid_order_created";

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
}

export class RsvpNotificationRouter {
	private notificationService: NotificationService;

	constructor() {
		this.notificationService = new NotificationService();
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
	 * Handle reservation created event
	 * Notify: Store (new reservation request)
	 */
	private async handleCreated(context: RsvpNotificationContext) {
		if (!context.storeOwnerId) {
			return;
		}

		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
		);
		const customerName =
			context.customerName || context.customerEmail || "Anonymous";

		const subject = `New Reservation Request: ${customerName}`;
		const message = this.buildCreatedMessage(context, rsvpTimeFormatted);

		await this.notificationService.createNotification({
			senderId: context.customerId || context.storeOwnerId, // Use customer if available, otherwise store owner
			recipientId: context.storeOwnerId,
			storeId: context.storeId,
			subject,
			message,
			notificationType: "reservation",
			actionUrl: context.actionUrl || `/storeAdmin/${context.storeId}/rsvp`,
			priority: 1, // High priority for new reservations
			channels: ["onsite", "email"],
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

		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
		);
		const customerName =
			context.customerName || context.customerEmail || "Anonymous";

		const subject = `Reservation Updated: ${customerName}`;
		const message = this.buildUpdatedMessage(context, rsvpTimeFormatted);

		await this.notificationService.createNotification({
			senderId: context.customerId || context.storeOwnerId,
			recipientId: context.storeOwnerId,
			storeId: context.storeId,
			subject,
			message,
			notificationType: "reservation",
			actionUrl: context.actionUrl || `/storeAdmin/${context.storeId}/rsvp`,
			priority: 1,
			channels: ["onsite", "email"],
		});
	}

	/**
	 * Handle reservation cancelled event
	 * Notify: Store (reservation cancelled)
	 * Notify: Customer (if logged in or has contact info)
	 */
	private async handleCancelled(context: RsvpNotificationContext) {
		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
		);
		const customerName =
			context.customerName || context.customerEmail || "Anonymous";

		// Notify store
		if (context.storeOwnerId) {
			const storeSubject = `Reservation Cancelled: ${customerName}`;
			const storeMessage = this.buildCancelledMessage(
				context,
				rsvpTimeFormatted,
				true, // isStore
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
				channels: ["onsite", "email"],
			});
		}

		// Notify customer (if logged in)
		if (context.customerId) {
			const customerSubject = "Your Reservation Has Been Cancelled";
			const customerMessage = this.buildCancelledMessage(
				context,
				rsvpTimeFormatted,
				false, // isStore
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
				channels: ["onsite", "email"],
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

		const customerName =
			context.customerName || context.customerEmail || "Anonymous";

		const subject = `Reservation Deleted: ${customerName}`;
		const message = this.buildDeletedMessage(context);

		await this.notificationService.createNotification({
			senderId: context.customerId || context.storeOwnerId,
			recipientId: context.storeOwnerId,
			storeId: context.storeId,
			subject,
			message,
			notificationType: "reservation",
			actionUrl: context.actionUrl || `/storeAdmin/${context.storeId}/rsvp`,
			priority: 0,
			channels: ["onsite"],
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

		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
		);

		const subject = "Your Reservation Has Been Confirmed";
		const message = this.buildConfirmedMessage(
			context,
			rsvpTimeFormatted,
			true, // confirmedByStore
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
			channels: ["onsite", "email"],
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

		const customerName =
			context.customerName || context.customerEmail || "Anonymous";

		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
		);

		const subject = `Customer Confirmed Reservation: ${customerName}`;
		const message = this.buildConfirmedMessage(
			context,
			rsvpTimeFormatted,
			false, // confirmedByStore
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
			channels: ["onsite", "email"],
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

		// Handle specific status transitions
		if (context.status === RsvpStatus.ReadyToConfirm) {
			// Notify store when reservation is ready to confirm
			if (context.storeOwnerId) {
				const customerName =
					context.customerName || context.customerEmail || "Anonymous";

				const subject = `Reservation Ready to Confirm: ${customerName}`;
				const message = await this.buildStatusChangedMessage(
					context,
					context.previousStatus,
					context.status,
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
					channels: ["onsite", "email"],
				});
			}
		} else if (context.status === RsvpStatus.Ready) {
			// Notify customer when reservation is ready
			if (context.customerId) {
				const subject = "Your Reservation is Ready";
				const message = await this.buildStatusChangedMessage(
					context,
					context.previousStatus,
					context.status,
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
					channels: ["onsite", "email"],
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

		const customerName =
			context.customerName || context.customerEmail || "Anonymous";

		const subject = `Payment Received for Reservation: ${customerName}`;
		const message = await this.buildPaymentReceivedMessage(context);

		await this.notificationService.createNotification({
			senderId: context.customerId || context.storeOwnerId,
			recipientId: context.storeOwnerId,
			storeId: context.storeId,
			subject,
			message,
			notificationType: "reservation",
			actionUrl: context.actionUrl || `/storeAdmin/${context.storeId}/rsvp`,
			priority: 1,
			channels: ["onsite", "email"],
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

		const subject = "Your Reservation is Ready";
		const message = await this.buildReadyMessage(context);

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
			channels: ["onsite", "email"],
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

		const subject = "Your Reservation Has Been Completed";
		const message = await this.buildCompletedMessage(context);

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
			channels: ["onsite", "email"],
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

		const customerName =
			context.customerName || context.customerEmail || "Anonymous";

		const subject = `No-Show: ${customerName}`;
		const message = await this.buildNoShowMessage(context);

		await this.notificationService.createNotification({
			senderId: context.storeOwnerId,
			recipientId: context.storeOwnerId,
			storeId: context.storeId,
			subject,
			message,
			notificationType: "reservation",
			actionUrl: context.actionUrl || `/storeAdmin/${context.storeId}/rsvp`,
			priority: 0,
			channels: ["onsite", "email"],
		});
	}

	// Message builders
	private buildCreatedMessage(
		context: RsvpNotificationContext,
		rsvpTimeFormatted: string,
	): string {
		const parts: string[] = [];
		parts.push(`New reservation request received:`);
		parts.push(``);
		parts.push(
			`Customer: ${context.customerName || context.customerEmail || "Anonymous"}`,
		);
		if (context.facilityName) {
			parts.push(`Facility: ${context.facilityName}`);
		}
		if (context.serviceStaffName) {
			parts.push(`Service Staff: ${context.serviceStaffName}`);
		}
		parts.push(`Date/Time: ${rsvpTimeFormatted}`);
		parts.push(
			`Party Size: ${context.numOfAdult || 1} adult(s), ${context.numOfChild || 0} child(ren)`,
		);
		if (context.message) {
			parts.push(`Message: ${context.message}`);
		}
		return parts.join("\n");
	}

	private buildUpdatedMessage(
		context: RsvpNotificationContext,
		rsvpTimeFormatted: string,
	): string {
		const parts: string[] = [];
		parts.push(`Reservation has been updated:`);
		parts.push(``);
		parts.push(
			`Customer: ${context.customerName || context.customerEmail || "Anonymous"}`,
		);
		if (context.facilityName) {
			parts.push(`Facility: ${context.facilityName}`);
		}
		parts.push(`Date/Time: ${rsvpTimeFormatted}`);
		parts.push(
			`Party Size: ${context.numOfAdult || 1} adult(s), ${context.numOfChild || 0} child(ren)`,
		);
		if (context.message) {
			parts.push(`Message: ${context.message}`);
		}
		return parts.join("\n");
	}

	private buildCancelledMessage(
		context: RsvpNotificationContext,
		rsvpTimeFormatted: string,
		isStore: boolean,
	): string {
		const parts: string[] = [];
		if (isStore) {
			parts.push(`Reservation has been cancelled:`);
			parts.push(``);
			parts.push(
				`Customer: ${context.customerName || context.customerEmail || "Anonymous"}`,
			);
		} else {
			parts.push(`Your reservation has been cancelled:`);
			parts.push(``);
			parts.push(`Store: ${context.storeName || "Store"}`);
		}
		if (context.facilityName) {
			parts.push(`Facility: ${context.facilityName}`);
		}
		parts.push(`Date/Time: ${rsvpTimeFormatted}`);
		if (context.refundAmount && context.refundAmount > 0) {
			parts.push(
				`Refund Amount: ${context.refundAmount} ${context.refundCurrency || ""}`,
			);
		}
		return parts.join("\n");
	}

	private buildDeletedMessage(context: RsvpNotificationContext): string {
		const parts: string[] = [];
		parts.push(`Reservation has been deleted:`);
		parts.push(``);
		parts.push(
			`Customer: ${context.customerName || context.customerEmail || "Anonymous"}`,
		);
		if (context.facilityName) {
			parts.push(`Facility: ${context.facilityName}`);
		}
		return parts.join("\n");
	}

	private buildConfirmedMessage(
		context: RsvpNotificationContext,
		rsvpTimeFormatted: string,
		confirmedByStore: boolean,
	): string {
		const parts: string[] = [];
		if (confirmedByStore) {
			parts.push(`Your reservation has been confirmed by the store:`);
			parts.push(``);
			parts.push(`Store: ${context.storeName || "Store"}`);
		} else {
			parts.push(`Customer has confirmed the reservation:`);
			parts.push(``);
			parts.push(
				`Customer: ${context.customerName || context.customerEmail || "Anonymous"}`,
			);
		}
		if (context.facilityName) {
			parts.push(`Facility: ${context.facilityName}`);
		}
		parts.push(`Date/Time: ${rsvpTimeFormatted}`);
		parts.push(
			`Party Size: ${context.numOfAdult || 1} adult(s), ${context.numOfChild || 0} child(ren)`,
		);
		return parts.join("\n");
	}

	private async buildStatusChangedMessage(
		context: RsvpNotificationContext,
		previousStatus: number,
		newStatus: number,
	): Promise<string> {
		const statusNames: Record<number, string> = {
			[RsvpStatus.Pending]: "Pending",
			[RsvpStatus.ReadyToConfirm]: "Ready to Confirm",
			[RsvpStatus.Ready]: "Ready",
			[RsvpStatus.Completed]: "Completed",
			[RsvpStatus.Cancelled]: "Cancelled",
			[RsvpStatus.NoShow]: "No Show",
		};

		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
		);

		const parts: string[] = [];
		parts.push(`Reservation status has changed:`);
		parts.push(``);
		parts.push(`From: ${statusNames[previousStatus] || previousStatus}`);
		parts.push(`To: ${statusNames[newStatus] || newStatus}`);
		if (context.facilityName) {
			parts.push(`Facility: ${context.facilityName}`);
		}
		parts.push(`Date/Time: ${rsvpTimeFormatted}`);
		return parts.join("\n");
	}

	private async buildPaymentReceivedMessage(
		context: RsvpNotificationContext,
	): Promise<string> {
		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
		);

		const parts: string[] = [];
		parts.push(`Payment has been received for reservation:`);
		parts.push(``);
		parts.push(
			`Customer: ${context.customerName || context.customerEmail || "Anonymous"}`,
		);
		if (context.facilityName) {
			parts.push(`Facility: ${context.facilityName}`);
		}
		parts.push(`Date/Time: ${rsvpTimeFormatted}`);
		return parts.join("\n");
	}

	private async buildReadyMessage(
		context: RsvpNotificationContext,
	): Promise<string> {
		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
		);
		const arriveTimeFormatted = context.arriveTime
			? await this.formatRsvpTime(context.arriveTime, context.storeId)
			: null;

		const parts: string[] = [];
		parts.push(`Your reservation is ready:`);
		parts.push(``);
		parts.push(`Store: ${context.storeName || "Store"}`);
		if (context.facilityName) {
			parts.push(`Facility: ${context.facilityName}`);
		}
		parts.push(`Date/Time: ${rsvpTimeFormatted}`);
		if (arriveTimeFormatted) {
			parts.push(`Arrival Time: ${arriveTimeFormatted}`);
		}
		return parts.join("\n");
	}

	private async buildCompletedMessage(
		context: RsvpNotificationContext,
	): Promise<string> {
		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
		);

		const parts: string[] = [];
		parts.push(`Your reservation has been completed:`);
		parts.push(``);
		parts.push(`Store: ${context.storeName || "Store"}`);
		if (context.facilityName) {
			parts.push(`Facility: ${context.facilityName}`);
		}
		parts.push(`Date/Time: ${rsvpTimeFormatted}`);
		return parts.join("\n");
	}

	private async buildNoShowMessage(
		context: RsvpNotificationContext,
	): Promise<string> {
		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
		);

		const parts: string[] = [];
		parts.push(`Customer did not show up for reservation:`);
		parts.push(``);
		parts.push(
			`Customer: ${context.customerName || context.customerEmail || "Anonymous"}`,
		);
		if (context.facilityName) {
			parts.push(`Facility: ${context.facilityName}`);
		}
		parts.push(`Date/Time: ${rsvpTimeFormatted}`);
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

		const rsvpTimeFormatted = await this.formatRsvpTime(
			context.rsvpTime,
			context.storeId,
		);

		const subject = "Payment Required for Your Reservation";

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
		);

		// For logged-in customers, use standard notification flow (onsite and email)
		if (hasCustomerId && context.customerId) {
			await this.notificationService.createNotification({
				senderId: context.storeOwnerId || context.customerId || "",
				recipientId: context.customerId,
				storeId: context.storeId,
				subject,
				message,
				notificationType: "reservation",
				actionUrl: paymentUrl,
				priority: 1, // High priority for payment notifications
				channels: ["onsite", "email"],
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
					// Send via Twilio SMS for US/Canada numbers
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
				} else {
					logger.warn("Unsupported phone number format for SMS", {
						metadata: {
							rsvpId: context.rsvpId,
							customerPhone: normalizedPhone.replace(/\d(?=\d{4})/g, "*"),
							storeId: context.storeId,
						},
						tags: ["rsvp", "notification", "sms", "anonymous", "warning"],
					});
				}
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
			const storeNotificationMessage = `Unpaid order created for anonymous customer:\n\n${message}\n\nCustomer: ${customerName}\nPhone: ${customerPhone ? customerPhone.replace(/\d(?=\d{4})/g, "*") : "N/A"}`;
			try {
				await this.notificationService.createNotification({
					senderId: context.storeOwnerId,
					recipientId: context.storeOwnerId,
					storeId: context.storeId,
					subject: `Unpaid Order: ${customerName || "Anonymous Customer"}`,
					message: storeNotificationMessage,
					notificationType: "reservation",
					actionUrl: `/storeAdmin/${context.storeId}/rsvp`,
					priority: 1, // High priority
					channels: ["onsite"], // Only onsite for store notifications
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
		paymentUrl?: string | null,
	): Promise<string> {
		const parts: string[] = [];
		parts.push(`Payment is required for your reservation:`);
		parts.push(``);
		parts.push(`Store: ${context.storeName || "Store"}`);
		if (context.facilityName) {
			parts.push(`Facility: ${context.facilityName}`);
		}
		if (context.serviceStaffName) {
			parts.push(`Service Staff: ${context.serviceStaffName}`);
		}
		parts.push(`Date/Time: ${rsvpTimeFormatted}`);
		parts.push(
			`Party Size: ${context.numOfAdult || 1} adult(s), ${context.numOfChild || 0} child(ren)`,
		);
		parts.push(``);
		parts.push(`Please complete payment to confirm your reservation.`);
		// Include payment URL if provided (for SMS messages to anonymous users)
		if (paymentUrl) {
			parts.push(``);
			parts.push(`Payment link: ${paymentUrl}`);
		}
		return parts.join("\n");
	}

	/**
	 * Format RSVP time for display
	 */
	private async formatRsvpTime(
		rsvpTime: bigint | null | undefined,
		storeId: string,
	): Promise<string> {
		if (!rsvpTime) {
			return "N/A";
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
				return "N/A";
			}

			const offsetHours = getTimezoneOffsetForDate(date, timezone);
			const dateInTz = getDateInTz(date, offsetHours);
			return format(dateInTz, "yyyy-MM-dd HH:mm");
		} catch (error) {
			logger.warn("Failed to format RSVP time", {
				metadata: {
					rsvpTime: String(rsvpTime),
					storeId,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["rsvp", "notification", "format"],
			});
			return "N/A";
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
