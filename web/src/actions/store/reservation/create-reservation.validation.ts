import { z } from "zod";

export const createReservationSchema = z.object({
	storeId: z.string().min(1, "Store ID is required"),
	userId: z.string().nullable().optional(),
	email: z.string().email("Invalid email address").optional(),
	phone: z.string().optional(),
	facilityId: z.string().nullable().optional(),
	numOfAdult: z.coerce.number().int().min(1).default(1),
	numOfChild: z.coerce.number().int().min(0).default(0),
	// Use z.date() for form validation (form uses Date objects)
	// Server action will receive Date objects (safe-action handles serialization)
	rsvpTime: z.date(),
	message: z.string().nullable().optional(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
