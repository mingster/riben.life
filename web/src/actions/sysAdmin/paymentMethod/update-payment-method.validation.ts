import { createPaymentMethodSchema } from "./create-payment-method.validation";
import { z } from "zod";

export const updatePaymentMethodSchema = createPaymentMethodSchema.extend({
	id: z.string().min(1, "ID is required"),
});

export type UpdatePaymentMethodInput = z.infer<
	typeof updatePaymentMethodSchema
>;
