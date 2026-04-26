import { z } from "zod";

export const sendReservationMessageSchema = z.object({
	id: z.string().min(1, "Reservation ID is required"),
	message: z.string().trim().min(1, "Message is required"),
});

export type SendReservationMessageInput = z.infer<
	typeof sendReservationMessageSchema
>;
