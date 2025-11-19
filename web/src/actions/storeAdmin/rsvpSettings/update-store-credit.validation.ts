import { z } from "zod";

export const updateStoreCreditSchema = z.object({
	storeId: z.string().min(1),
	useCustomerCredit: z.boolean().default(false),
	creditExchangeRate: z.coerce.number().min(0).default(0),
});

export type UpdateStoreCreditInput = z.infer<typeof updateStoreCreditSchema>;
