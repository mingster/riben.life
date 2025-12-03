import { z } from "zod";

export const updateStorePaidOptionsSchema = z.object({
	customDomain: z.string().optional().nullable(),
	LINE_PAY_ID: z.string().optional().nullable(),
	LINE_PAY_SECRET: z.string().optional().nullable(),
	STRIPE_SECRET_KEY: z.string().optional().nullable(),
	logo: z.string().optional().nullable(),
	logoPublicId: z.string().optional().nullable(),
	acceptAnonymousOrder: z.boolean().optional(),
	defaultTimezone: z.string().optional(),
});

export type UpdateStorePaidOptionsInput = z.infer<
	typeof updateStorePaidOptionsSchema
>;
