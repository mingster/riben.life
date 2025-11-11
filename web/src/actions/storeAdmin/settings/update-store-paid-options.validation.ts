import { z } from "zod/v4";

export const updateStorePaidOptionsSchema = z.object({
	storeId: z.string().min(1),
	customDomain: z.string().optional().nullable(),
	LINE_PAY_ID: z.string().optional().nullable(),
	LINE_PAY_SECRET: z.string().optional().nullable(),
	STRIPE_SECRET_KEY: z.string().optional().nullable(),
	logo: z.string().optional().nullable(),
	logoPublicId: z.string().optional().nullable(),
	acceptAnonymousOrder: z.boolean().optional(),
	defaultTimezone: z.number().optional(),
});

export type UpdateStorePaidOptionsInput = z.infer<
	typeof updateStorePaidOptionsSchema
>;
