import type {
	RsvpDefaultArgs,
	RsvpGetPayload,
} from "@/generated/prisma/models/Rsvp";
import type {
	StoreDefaultArgs,
	StoreGetPayload,
} from "@/generated/prisma/models/Store";

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
} satisfies StoreDefaultArgs;

export type FacilityReservationStoreSlice = StoreGetPayload<
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
	},
} satisfies RsvpDefaultArgs;

export type FacilityReservationRsvpRow = RsvpGetPayload<
	typeof facilityReservationRsvpArgs
>;
