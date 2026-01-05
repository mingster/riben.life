import { z } from "zod";

export const createRefillAccountBalanceOrderSchema = z.object({
	storeId: z.string().min(1, "Store ID is required"),
	fiatAmount: z.coerce
		.number()
		.positive("Fiat amount must be positive")
		.min(0.01, "Fiat amount must be at least 0.01"),
	paymentMethodId: z.string().min(1, "Payment method is required"),
	rsvpId: z.string().optional(),
});

export type CreateRefillAccountBalanceOrderInput = z.infer<
	typeof createRefillAccountBalanceOrderSchema
>;
