import { z } from "zod/v4";

export const updateUserSettingsSchema = z.object({
	id: z.string(),
	name: z.string().min(5, {
		error: "name is required",
	}),
	email: z.email().optional(),
	password: z.string().optional(),
	locale: z.string().min(1, {
		error: "locale is required",
	}),
	timezone: z.string(),
	role: z.string(),
	stripeCustomerId: z.string(),
});

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
