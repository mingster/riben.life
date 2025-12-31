import { z } from "zod";

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
	stripeCustomerId: z.string().optional(),
	phoneNumber: z.string().optional(),
	phoneNumberVerified: z.boolean().optional(),
	image: z.string().url().optional().or(z.literal("")),
	twoFactorEnabled: z.boolean().optional(),
	banned: z.boolean().optional(),
	banReason: z.string().optional(),
	banExpires: z.string().optional(), // ISO date string
});

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
