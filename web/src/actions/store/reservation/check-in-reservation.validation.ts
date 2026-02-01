import { z } from "zod";

export const checkInReservationSchema = z.object({
	storeId: z.string().min(1, "Store ID is required"),
	rsvpId: z.string().min(1, "Reservation ID is required"),
});

export type CheckInReservationInput = z.infer<typeof checkInReservationSchema>;
