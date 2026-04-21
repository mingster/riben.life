import { z } from "zod";

const emptyToNullNumber = z
	.preprocess(
		(v) => (v === "" || v === null || v === undefined ? null : v),
		z.union([z.coerce.number().min(0), z.null()]),
	)
	.default(null);

const optionalIntNullable = z
	.preprocess(
		(v) => (v === "" || v === null || v === undefined ? null : v),
		z.union([z.coerce.number().int().min(0), z.null()]),
	)
	.default(null);

/** Shared optional fields for create/update product (admin form). */
export const productFormExtrasSchema = z.object({
	careContent: z.string().optional().default(""),
	slug: z.string().optional().default(""),
	compareAtPrice: emptyToNullNumber,
	specsJsonText: z.string().optional().default(""),
	attributeLength: z.coerce.number().min(0).optional().default(0),
	attributeHeight: z.coerce.number().min(0).optional().default(0),
	attributeWidth: z.coerce.number().min(0).optional().default(0),
	attributeMfgPartNumber: z.string().optional().nullable(),
	attributeWeight: z.coerce.number().min(0).optional().default(0),
	attributeStock: z.coerce.number().int().min(0).optional().default(0),
	attributeDisplayStockAvailability: z.boolean().optional().default(false),
	attributeDisplayStockQuantity: z.boolean().optional().default(false),
	attributeAllowBackOrder: z.boolean().optional().default(false),
	attributeOrderMinQuantity: z.coerce
		.number()
		.int()
		.min(1)
		.optional()
		.default(1),
	attributeOrderMaxQuantity: z.coerce
		.number()
		.int()
		.min(0)
		.optional()
		.default(0),
	attributeDisableBuyButton: z.boolean().optional().default(false),
	attributeIsBrandNew: z.boolean().optional().default(true),
	attributeIsShipRequired: z.boolean().optional().default(false),
	attributeIsFreeShipping: z.boolean().optional().default(false),
	attributeAdditionalShipCost: z.coerce.number().min(0).optional().default(0),
	/** Datetime-local value or empty (maps to `ProductAttribute.availableEndDate`). */
	attributeAvailableEndDate: z.string().optional().default(""),
	attributeIsCreditTopUp: z.boolean().optional().default(false),
	attributeIsRecurring: z.boolean().optional().default(false),
	attributeInterval: optionalIntNullable,
	attributeIntervalCount: optionalIntNullable,
	attributeTrialPeriodDays: optionalIntNullable,
	attributeStripePriceId: z.string().optional().default(""),
	/** Newlines or commas; used on update only (ignored on create). */
	relatedProductIdsText: z.string().optional().default(""),
});

export type ProductFormExtrasInput = z.infer<typeof productFormExtrasSchema>;
