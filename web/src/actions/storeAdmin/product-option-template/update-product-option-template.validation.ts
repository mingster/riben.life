import { createProductOptionTemplateSchema } from "./create-product-option-template.validation";
import { z } from "zod";

export const updateProductOptionTemplateSchema =
	createProductOptionTemplateSchema.extend({
		id: z.string().min(1),
	});
