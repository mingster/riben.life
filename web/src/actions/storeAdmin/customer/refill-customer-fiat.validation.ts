import { z } from "zod";

export const refillCustomerFiatSchema = z
	.object({
		userId: z.string().min(1, "userId is required"),
		fiatAmount: z.coerce
			.number()
			.positive("Fiat amount must be positive")
			.min(0.01, "Fiat amount must be at least 0.01"),
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
			} else {
				// If isPaid is false (promotional), fiatAmount is required
				if (data.fiatAmount === null || data.fiatAmount === undefined) {
					return false;
				}
				if (data.fiatAmount <= 0) {
					return false;
				}
				return true;
			}
		},
		{
			message: "customer_fiat_cash_amount_required_when_paid",
			path: ["cashAmount"],
		},
	)
	.refine(
		(data) => {
			// If isPaid is false, fiatAmount must be provided
			if (!data.isPaid) {
				if (data.fiatAmount === null || data.fiatAmount === undefined) {
					return false;
				}
				if (data.fiatAmount <= 0) {
					return false;
				}
				return true;
			}
			return true;
		},
		{
			message: "customer_fiat_amount_required_for_promotional",
			path: ["fiatAmount"],
		},
	);

export type RefillCustomerFiatInput = z.infer<typeof refillCustomerFiatSchema>;
