import { z } from "zod";

export const createRechargeOrderSchema = z.object({
	storeId: z.string().min(1, "Store ID is required"),
	creditAmount: z.coerce
		.number()
		.positive("Credit amount must be positive")
		.min(1, "Credit amount must be at least 1 point"),
});

export type CreateRechargeOrderInput = z.infer<
	typeof createRechargeOrderSchema
>;
