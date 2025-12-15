import { z } from "zod";

export const deletePaymentMethodSchema = z.object({
	id: z.string().min(1, "ID is required"),
});

export type DeletePaymentMethodInput = z.infer<
	typeof deletePaymentMethodSchema
>;
