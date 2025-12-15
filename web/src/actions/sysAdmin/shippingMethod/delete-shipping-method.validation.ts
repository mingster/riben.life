import { z } from "zod";

export const deleteShippingMethodSchema = z.object({
	id: z.string().min(1, "ID is required"),
});

export type DeleteShippingMethodInput = z.infer<
	typeof deleteShippingMethodSchema
>;
