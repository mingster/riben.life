import { z } from "zod";

export const createRechargeOrderSchema = z.object({
	storeId: z.string().min(1, "Store ID is required"),
	amount: z.coerce.number().positive("Amount must be positive"),
});

export type CreateRechargeOrderInput = z.infer<typeof createRechargeOrderSchema>;

