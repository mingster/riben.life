import type { RsvpDefaultArgs } from "@/generated/prisma/models/Rsvp";

/**
 * Shared Prisma payload args moved out of `types.d.ts` so reusable payload
 * shapes live in normal TypeScript modules.
 */
export const rsvpPayloadArgs = {
	include: {
		Store: true,
		Customer: true,
		Order: true,
		Facility: true,
		FacilityPricingRule: true,
		CreatedBy: true,
		ServiceStaff: {
			include: {
				User: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		},
	},
} satisfies RsvpDefaultArgs;
