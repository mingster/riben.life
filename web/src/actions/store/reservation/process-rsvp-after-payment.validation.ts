import { z } from "zod";

export const processRsvpAfterPaymentSchema = z.object({
	orderId: z.string().min(1, "Order ID is required"),
});

export type ProcessRsvpAfterPaymentInput = z.infer<
	typeof processRsvpAfterPaymentSchema
>;
