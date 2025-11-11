import { z } from "zod/v4";

export const updateStoreShippingMethodsSchema = z.object({
	storeId: z.string().min(1),
	methodIds: z.array(z.string().min(1)),
});

export type UpdateStoreShippingMethodsInput = z.infer<
	typeof updateStoreShippingMethodsSchema
>;
