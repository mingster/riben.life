import { z } from "zod";

export const updateReservationSchema = z.object({
	id: z.string().min(1, "Reservation ID is required"),
	facilityId: z.string().nullable().optional(),
	numOfAdult: z.coerce.number().int().min(1).default(1),
	numOfChild: z.coerce.number().int().min(0).default(0),
	rsvpTime: z.coerce.date(),
	message: z.string().nullable().optional(),
});

export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;
