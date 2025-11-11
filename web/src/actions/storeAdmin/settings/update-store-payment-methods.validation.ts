import { z } from "zod/v4";

export const updateStorePaymentMethodsSchema = z.object({
	storeId: z.string().min(1),
	methodIds: z.array(z.string().min(1)),
});

export type UpdateStorePaymentMethodsInput = z.infer<
	typeof updateStorePaymentMethodsSchema
>;
