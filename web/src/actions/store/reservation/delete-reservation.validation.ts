import { z } from "zod";

export const deleteReservationSchema = z.object({
	id: z.string().min(1, "Reservation ID is required"),
});

export type DeleteReservationInput = z.infer<typeof deleteReservationSchema>;
