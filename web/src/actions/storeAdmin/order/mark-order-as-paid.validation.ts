import { z } from "zod";

export const markOrderAsPaidSchema = z.object({
	orderId: z.string().min(1, "Order ID is required"),
	checkoutAttributes: z.string().optional(),
});

export type MarkOrderAsPaidInput = z.infer<typeof markOrderAsPaidSchema>;
