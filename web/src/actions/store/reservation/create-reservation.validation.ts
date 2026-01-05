import { z } from "zod";

export const createReservationSchema = z
	.object({
		storeId: z.string().min(1, "Store ID is required"),
		customerId: z.string().nullable().optional(),
		name: z.string().min(1, "Name is required").optional(),
		phone: z.string().min(1, "Phone number is required").optional(),
		facilityId: z.string().nullable().optional(),
		serviceStaffId: z.string().nullable().optional(),
		numOfAdult: z.coerce.number().int().min(1).default(1),
		numOfChild: z.coerce.number().int().min(0).default(0),
		// Use z.date() for form validation (form uses Date objects)
		// Server action will receive Date objects (safe-action handles serialization)
		rsvpTime: z.date(),
		message: z.string().nullable().optional(),
	})
	.refine(
		(data) => {
			// If customerId is not provided (anonymous user), name and phone are required
			if (!data.customerId) {
				return !!(data.name && data.phone);
			}
			return true;
		},
		{
			message: "Name and phone are required for anonymous reservations",
			path: ["name"], // Show error on name field
		},
	);

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
