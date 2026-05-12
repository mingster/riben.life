import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";

/**
 * Loads a user by email with store-scoped orders, reservations, and credit data for the store admin customer detail page.
 */
export async function getStoreCustomerProfileForManage(
	email: string,
	storeId: string,
) {
	const user = await sqlClient.user.findUnique({
		where: {
			email,
		},
		include: {
			Orders: {
				where: {
					storeId,
				},
				include: {
					OrderItemView: {
						include: {
							Product: true,
						},
					},
					ShippingMethod: true,
					PaymentMethod: true,
					Store: true,
				},
				orderBy: {
					updatedAt: "desc",
				},
			},
			Reservations: {
				where: {
					storeId,
				},
				include: {
					Store: true,
					Facility: true,
					FacilityPricingRule: true,
					Customer: true,
					CreatedBy: true,
				},
				orderBy: {
					rsvpTime: "desc",
				},
			},
			CustomerCredit: true,
			CustomerCreditLedger: {
				where: {
					storeId,
				},
				orderBy: {
					createdAt: "desc",
				},
				include: {
					Creator: true,
					Store: true,
				},
			},
			CustomerFiatLedger: {
				where: {
					storeId,
				},
				orderBy: {
					createdAt: "desc",
				},
				include: {
					Creator: true,
					Store: true,
					StoreOrder: true,
				},
			},
		},
	});

	if (!user) {
		return null;
	}

	transformPrismaDataForJson(user);
	return user;
}

export type StoreCustomerManageUser = NonNullable<
	Awaited<ReturnType<typeof getStoreCustomerProfileForManage>>
>;

/** Single order row from {@link getStoreCustomerProfileForManage} (store-scoped Orders include). */
export type ManageProfileOrderRow = NonNullable<
	StoreCustomerManageUser["Orders"]
>[number];
