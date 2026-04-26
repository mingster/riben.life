import type { Prisma } from "@prisma/client";

/** `store.findFirst` select for the public facility reservation page. */
export const facilityReservationStoreArgs = {
	select: {
		id: true,
		name: true,
		ownerId: true,
		defaultTimezone: true,
		defaultCurrency: true,
		useBusinessHours: true,
		useCustomerCredit: true,
		creditExchangeRate: true,
		creditServiceExchangeRate: true,
	},
} satisfies Prisma.StoreFindFirstArgs;

export type FacilityReservationStoreSlice = Prisma.StoreGetPayload<
	typeof facilityReservationStoreArgs
>;

/** `rsvp.findMany` include for the public facility reservation page. */
export const facilityReservationRsvpArgs = {
	include: {
		Store: true,
		Customer: true,
		CreatedBy: true,
		Order: true,
		Facility: true,
		FacilityPricingRule: true,
		ServiceStaff: {
			select: {
				id: true,
				User: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		},
		RsvpConversation: {
			include: {
				Messages: {
					where: { deletedAt: null },
					orderBy: { createdAt: "asc" },
				},
			},
		},
	},
} satisfies Prisma.RsvpFindManyArgs;

export type FacilityReservationRsvpRow = Prisma.RsvpGetPayload<
	typeof facilityReservationRsvpArgs
>;
