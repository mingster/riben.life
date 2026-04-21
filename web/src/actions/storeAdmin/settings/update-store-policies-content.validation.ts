import { z } from "zod";

/** Partial update: only include fields being saved from a tab. Omitted keys preserve existing DB values. */
export const updateStorePoliciesContentSchema = z.object({
	privacyPolicy: z.string().optional(),
	tos: z.string().optional(),
	storefrontShippingPolicy: z.string().optional(),
	storefrontReturnPolicy: z.string().optional(),
	storefrontGiftingContent: z.string().optional(),
});

export type UpdateStorePoliciesContentInput = z.infer<
	typeof updateStorePoliciesContentSchema
>;

/** Single policy tab editor (one markdown field per save). */
export const updateStorePolicyTabContentSchema = z.object({
	content: z.string(),
});

export type UpdateStorePolicyTabContentInput = z.infer<
	typeof updateStorePolicyTabContentSchema
>;
