import { z } from "zod";

export const processFiatTopUpAfterPaymentSchema = z.object({
	orderId: z.string().min(1, "Order ID is required"),
});

export type ProcessFiatTopUpAfterPaymentInput = z.infer<
	typeof processFiatTopUpAfterPaymentSchema
>;
