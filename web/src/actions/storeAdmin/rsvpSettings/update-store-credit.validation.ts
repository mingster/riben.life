import { z } from "zod";

export const updateStoreCreditSchema = z.object({
	useCustomerCredit: z.boolean().default(false),
	creditExchangeRate: z.coerce.number().min(0).default(0),
	creditServiceExchangeRate: z.coerce.number().min(0).default(0),
	creditMaxPurchase: z.coerce.number().min(0).default(0),
	creditMinPurchase: z.coerce.number().min(0).default(0),
	creditExpiration: z.coerce.number().int().min(0).default(365),
});

export type UpdateStoreCreditInput = z.infer<typeof updateStoreCreditSchema>;
