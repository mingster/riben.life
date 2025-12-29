import { z } from "zod";

export const updateOrderPaymentMethodSchema = z.object({
	orderId: z.string().min(1, "Order ID is required"),
	paymentMethodId: z.string().min(1, "Payment method ID is required"),
});

export type UpdateOrderPaymentMethodInput = z.infer<
	typeof updateOrderPaymentMethodSchema
>;
