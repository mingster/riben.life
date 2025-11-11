import { z } from "zod/v4";

export const updateStoreBankSchema = z.object({
	storeId: z.string().min(1),
	payoutSchedule: z.number(),
	bankCode: z.string().min(1),
	bankAccount: z.string().min(1),
	bankAccountName: z.string().min(1),
});

export type UpdateStoreBankInput = z.infer<typeof updateStoreBankSchema>;
