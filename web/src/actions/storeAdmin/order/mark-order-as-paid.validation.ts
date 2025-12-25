import { z } from "zod";

export const markOrderAsPaidSchema = z.object({
	orderId: z.string().min(1, "Order ID is required"),
	paymentMethodId: z
		.string()
		.min(1, "Payment method ID is required")
		.optional(),
	checkoutAttributes: z.string().optional(),
});

export type MarkOrderAsPaidInput = z.infer<typeof markOrderAsPaidSchema>;
