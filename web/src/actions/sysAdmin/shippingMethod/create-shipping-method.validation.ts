import { z } from "zod";

export const createShippingMethodSchema = z.object({
	name: z.string().min(1, "Name is required"),
	identifier: z.string().default(""),
	description: z.string().optional().nullable(),
	basic_price: z.coerce.number().default(0),
	currencyId: z.string().min(1).default("twd"),
	isDeleted: z.boolean().default(false),
	isDefault: z.boolean().default(false),
	shipRequired: z.boolean().default(true),
	canDelete: z.boolean().default(false),
});

export type CreateShippingMethodInput = z.infer<
	typeof createShippingMethodSchema
>;
