import { z } from "zod";

export const cancelReservationSchema = z.object({
	id: z.string().min(1, "Reservation ID is required"),
	storeId: z.string().min(1, "Store ID is required"),
});

export type CancelReservationInput = z.infer<typeof cancelReservationSchema>;
