import { z } from "zod";

export const updateStorePaymentMethodsSchema = z.object({
	methodIds: z.array(z.string().min(1)),
});

export type UpdateStorePaymentMethodsInput = z.infer<
	typeof updateStorePaymentMethodsSchema
>;
