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
			// Check for null, undefined, or empty string
			const hasCustomerId =
				data.customerId !== null &&
				data.customerId !== undefined &&
				data.customerId !== "";
			if (!hasCustomerId) {
				// Check that both name and phone are non-empty strings (after trimming)
				const name =
					data.name !== null && data.name !== undefined
						? String(data.name).trim()
						: "";
				const phone =
					data.phone !== null && data.phone !== undefined
						? String(data.phone).trim()
						: "";
				return name.length > 0 && phone.length > 0;
			}
			return true;
		},
		{
			message: "rsvp_name_and_phone_required_for_anonymous",
			path: ["name"], // Show error on name field
		},
	)
	.refine(
		(data) => {
			// If customerId is not provided (anonymous user), phone is also required
			const hasCustomerId =
				data.customerId !== null &&
				data.customerId !== undefined &&
				data.customerId !== "";
			if (!hasCustomerId) {
				const phone =
					data.phone !== null && data.phone !== undefined
						? String(data.phone).trim()
						: "";
				return phone.length > 0;
			}
			return true;
		},
		{
			message: "rsvp_phone_required_for_anonymous",
			path: ["phone"], // Show error on phone field
		},
	);

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
