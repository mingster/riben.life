import { z } from "zod";

export const updateStoreShippingMethodsSchema = z.object({
	storeId: z.string().min(1),
	methodIds: z.array(z.string().min(1)),
});

export type UpdateStoreShippingMethodsInput = z.infer<
	typeof updateStoreShippingMethodsSchema
>;
