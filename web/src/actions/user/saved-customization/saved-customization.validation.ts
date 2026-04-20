import { z } from "zod";

import { bagCustomizationClientInputSchema } from "@/actions/product/customize-product.validation";

export const upsertSavedCustomizationSchema = z.object({
	productId: z.string().uuid(),
	productName: z.string().min(1).max(512).optional(),
	customization: bagCustomizationClientInputSchema,
});

export type UpsertSavedCustomizationInput = z.infer<
	typeof upsertSavedCustomizationSchema
>;

export const deleteSavedCustomizationSchema = z
	.object({
		id: z.string().uuid().optional(),
		productId: z.string().uuid().optional(),
	})
	.refine((data) => Boolean(data.id) || Boolean(data.productId), {
		message: "Either id or productId is required",
	});

export type DeleteSavedCustomizationInput = z.infer<
	typeof deleteSavedCustomizationSchema
>;
