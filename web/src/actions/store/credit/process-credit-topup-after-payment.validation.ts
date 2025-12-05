import { z } from "zod";

export const processCreditTopUpAfterPaymentSchema = z.object({
	orderId: z.string().min(1, "Order ID is required"),
});

export type ProcessCreditTopUpAfterPaymentInput = z.infer<
	typeof processCreditTopUpAfterPaymentSchema
>;

