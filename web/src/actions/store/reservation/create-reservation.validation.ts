import { z } from "zod";
import { validatePhoneNumber } from "@/utils/phone-utils";

export const createReservationSchema = z
	.object({
		storeId: z.string().min(1, "Store ID is required"),
		customerId: z.string().nullable().optional(),
		name: z.string().min(1, "rsvp_name_required_for_anonymous").optional(),
		phone: z.string().min(1, "phone_number_required").optional(),
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
			// If customerId is not provided (anonymous user), phone is also required
			const hasCustomerId =
				data.customerId !== null &&
				data.customerId !== undefined &&
				data.customerId !== "";
			if (!hasCustomerId) {
				const name =
					data.name !== null && data.name !== undefined
						? String(data.name).trim()
						: "";
				return name.length > 0;
			}
			return true;
		},
		{
			message: "rsvp_name_required_for_anonymous",
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
			message: "phone_number_required",
			path: ["phone"], // Show error on phone field
		},
	)
	.refine(
		(data) => {
			// Validate phone number format if phone is provided
			if (data.phone) {
				const phone = String(data.phone).trim();
				if (phone.length > 0) {
					return validatePhoneNumber(phone);
				}
			}
			return true;
		},
		{
			message: "phone_number_invalid_format",
			path: ["phone"], // Show error on phone field
		},
	);

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
