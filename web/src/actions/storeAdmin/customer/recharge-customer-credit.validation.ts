import { z } from "zod";

export const rechargeCustomerCreditSchema = z
	.object({
		userId: z.string().min(1, "userId is required"),
		creditAmount: z.coerce
			.number()
			.int("Credit amount must be an integer")
			.positive("Credit amount must be positive"),
		cashAmount: z.coerce.number().default(0), // Default to 0, required if isPaid = true
		isPaid: z.boolean().default(true), // true = customer paid in person, false = promotional
		note: z.string().optional().nullable(),
	})
	.refine(
		(data) => {
			// If isPaid is true, cashAmount must be provided and positive
			if (data.isPaid) {
				if (data.cashAmount === null || data.cashAmount === undefined) {
					return false;
				}
				if (data.cashAmount <= 0) {
					return false;
				}
				return true;
			}
			return true;
		},
		{
			message: "customer_credit_cash_amount_required_when_paid",
			path: ["cashAmount"],
		},
	);

export type RechargeCustomerCreditInput = z.infer<
	typeof rechargeCustomerCreditSchema
>;
