import { z } from "zod";

export const createPaymentMethodSchema = z.object({
	name: z.string().min(1, "Name is required"),
	payUrl: z.string().default(""),
	priceDescr: z.string().default(""),
	fee: z.coerce.number().default(0.029),
	feeAdditional: z.coerce.number().default(0),
	clearDays: z.coerce.number().int().default(3),
	isDeleted: z.boolean().default(false),
	isDefault: z.boolean().default(false),
	canDelete: z.boolean().default(false),
	visibleToCustomer: z.boolean().default(false),
});

export type CreatePaymentMethodInput = z.infer<
	typeof createPaymentMethodSchema
>;
