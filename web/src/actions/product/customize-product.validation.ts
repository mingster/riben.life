import { z } from "zod";

import { bagCustomizationClientInputSchema } from "@/lib/product/bag-customization";

export {
	bagCustomizationClientInputSchema,
	bagCustomizationCoreSchema,
	bagCustomizationLegacySchema,
	bagCustomizationNormalizedSchema,
	bagCustomizationSchemaV1,
	parseBagCustomizationPayload,
	type BagCustomization,
	type BagCustomizationValidated,
} from "@/lib/product/bag-customization";

export const addCustomizedToCartInputSchema = z.object({
	productId: z.string().uuid(),
	customization: bagCustomizationClientInputSchema,
	quantity: z.number().min(1).default(1),
});

export type AddCustomizedToCartInput = z.infer<
	typeof addCustomizedToCartInputSchema
>;
