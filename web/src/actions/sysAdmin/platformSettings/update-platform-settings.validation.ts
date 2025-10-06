import { z } from "zod/v4";

export const updatePlatformSettingsSchema = z.object({
	//id: z.string().uuid().optional(), // Optional for create, required for update
	id: z.string(),
	stripeProductId: z.string(),
	stripePriceId: z.string(),
	settings: z.string().optional(),
	/*
	settings: z
		.object({
			key: z.string().min(1, { message: "key is required" }),
			value: z.string().min(1, { message: "value is required" }),
		})
		.array()
		.min(1, { message: "at least one item is required" }),
		*/
});

export type UpdatePlatformSettingsInput = z.infer<
	typeof updatePlatformSettingsSchema
>;
