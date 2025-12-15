import { createShippingMethodSchema } from "./create-shipping-method.validation";
import { z } from "zod";

export const updateShippingMethodSchema = createShippingMethodSchema.extend({
	id: z.string().min(1, "ID is required"),
});

export type UpdateShippingMethodInput = z.infer<
	typeof updateShippingMethodSchema
>;
