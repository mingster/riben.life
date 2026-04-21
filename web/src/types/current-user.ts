import type { Prisma } from "@prisma/client";

export const currentUserArgs = {
	include: {
		Addresses: true,
		Orders: {
			include: {
				ShippingMethod: true,
				PaymentMethod: true,
				OrderItemView: true,
				Store: {
					select: {
						id: true,
						name: true,
						defaultTimezone: true,
					},
				},
			},
			orderBy: {
				updatedAt: "desc",
			},
		},
		sessions: true,
		accounts: true,
		twofactors: true,
		passkeys: true,
		apikeys: true,
		members: true,
		invitations: true,
		Reservations: {
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
		CustomerCreditLedger: {
			include: {
				Creator: true,
				Store: true,
			},
			orderBy: {
				createdAt: "desc",
			},
		},
		CustomerCredit: true,
		CustomerFiatLedger: {
			orderBy: {
				createdAt: "desc",
			},
			include: {
				Creator: true,
				Store: true,
			},
		},
	},
} satisfies Prisma.UserDefaultArgs;

export type CurrentUser = Prisma.UserGetPayload<typeof currentUserArgs>;

/** Orders as loaded for the account profile (`currentUserArgs.Orders`). */
export type CurrentUserOrdersList = NonNullable<CurrentUser["Orders"]>;
export type CurrentUserOrderRow = CurrentUserOrdersList[number];
