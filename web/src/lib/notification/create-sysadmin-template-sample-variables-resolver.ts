import { sqlClient } from "@/lib/prismadb";
import { buildOrderLifecyclePayload } from "@/lib/notification/payload-mappers/order-lifecycle-payload";
import { buildReservationLifecyclePayload } from "@/lib/notification/payload-mappers/reservation-lifecycle-payload";
import { buildSubscriptionLifecyclePayload } from "@/lib/notification/payload-mappers/subscription-lifecycle-payload";
import type {
	NotificationLocale,
	RsvpNotificationContext,
} from "@/lib/notification/rsvp-notification-router";
import type { User } from "@/types";
import { RsvpStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

function resolveNotificationLocale(
	locale: string | null | undefined,
): NotificationLocale {
	if (locale === "en" || locale === "tw" || locale === "jp") {
		return locale;
	}
	return "tw";
}

export type SysAdminTemplateSampleDomain =
	| "order"
	| "reservation"
	| "subscription";

export interface CreateSysAdminTemplateSampleVariablesResolverParams {
	domain: SysAdminTemplateSampleDomain;
	sampleStoreId: string;
	sampleStoreName: string;
	supportEmail: string;
	platformName: string;
}

function mergeSupportEmail(
	payload: Record<string, unknown>,
	supportEmail: string,
): Record<string, any> {
	return {
		...payload,
		support: { email: supportEmail },
	} as Record<string, any>;
}

const SAMPLE_ORDER_ID = "sysadmin_sample_order";
const SAMPLE_RSVP_ID = "sysadmin_sample_rsvp";

/**
 * Builds a per-recipient resolver that fills template variables with realistic
 * sample data for sysAdmin test sends (order / reservation / subscription).
 */
export function createSysAdminTemplateSampleVariablesResolver(
	params: CreateSysAdminTemplateSampleVariablesResolverParams,
): (recipientId: string) => Promise<Record<string, any>> {
	const epochMs = getUtcNowEpoch();

	return async (recipientId: string): Promise<Record<string, any>> => {
		const supportOnly = (): Record<string, any> => ({
			support: { email: params.supportEmail },
		});

		const userRow = await sqlClient.user.findUnique({
			where: { id: recipientId },
			select: {
				id: true,
				name: true,
				email: true,
				phoneNumber: true,
				locale: true,
			},
		});

		if (!userRow) {
			return supportOnly();
		}

		const user = userRow as User;

		switch (params.domain) {
			case "order": {
				const recipientLocale = resolveNotificationLocale(userRow.locale);
				const payload = buildOrderLifecyclePayload({
					order: {
						id: SAMPLE_ORDER_ID,
						storeId: params.sampleStoreId,
						createdAt: epochMs,
						updatedAt: epochMs,
						total: 500,
						currency: "TWD",
						OrderItemView: [
							{
								name: "Sample item",
								quantity: 2,
								unitPrice: 250,
								variants: "Size: M",
							},
						],
					} as Parameters<typeof buildOrderLifecyclePayload>[0]["order"],
					user,
					storeName: params.sampleStoreName,
					locale: recipientLocale,
					accountBalanceBefore: 100,
					accountBalanceAfter: 600,
					reservation: {
						id: SAMPLE_RSVP_ID,
						status: RsvpStatus.ConfirmedByCustomer,
						previousStatus: RsvpStatus.Ready,
						dateTime: "2024-01-01 10:00",
						arriveTime: "2024-01-01 10:15",
						facilityName: "Meeting Room A",
						serviceStaffName: "Alex",
						numOfAdult: 2,
						numOfChild: 1,
						message: "Sample reservation note",
						checkInCode: "ABC123",
						actionUrl: "https://example.com/account/reservations",
						orderId: SAMPLE_ORDER_ID,
						paymentAmount: 500,
						paymentCurrency: "TWD",
						refundAmount: 100,
						refundCurrency: "TWD",
					},
				});
				return mergeSupportEmail(payload, params.supportEmail);
			}
			case "reservation": {
				const locale: NotificationLocale = "en";
				const context: RsvpNotificationContext = {
					rsvpId: SAMPLE_RSVP_ID,
					storeId: params.sampleStoreId,
					eventType: "updated",
					customerId: user.id,
					customerName: user.name,
					customerEmail: user.email,
					customerPhone: user.phoneNumber,
					storeName: params.sampleStoreName,
					rsvpTime: epochMs,
					arriveTime: epochMs,
					status: RsvpStatus.ConfirmedByCustomer,
					previousStatus: RsvpStatus.Ready,
					facilityName: "Meeting Room A",
					serviceStaffName: "Alex",
					numOfAdult: 2,
					numOfChild: 1,
					message: "Sample reservation note",
					checkInCode: "ABC123",
					actionUrl: "https://example.com/account/reservations",
					orderId: SAMPLE_ORDER_ID,
					paymentAmount: 500,
					paymentCurrency: "TWD",
					refundAmount: 100,
					refundCurrency: "TWD",
				};
				const payload = buildReservationLifecyclePayload({
					context,
					locale,
					storeName: params.sampleStoreName,
					order: {
						orderNumber: 10042,
						createdOn: epochMs,
						updatedAt: epochMs + 60_000n,
						total: "500 TWD",
					},
				});
				return mergeSupportEmail(payload, params.supportEmail);
			}
			case "subscription": {
				const payload = buildSubscriptionLifecyclePayload({
					user,
					storeId: params.sampleStoreId,
					storeName: params.sampleStoreName,
					platformName: params.platformName,
				});
				return mergeSupportEmail(payload, params.supportEmail);
			}
		}
	};
}
