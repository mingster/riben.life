import { z } from "zod";

export const updateUserSettingsSchema = z.object({
	id: z.string(),
	name: z.string().min(5, {
		error: "name is required",
	}),
	locale: z.string().min(1, {
		error: "locale is required",
	}),
	role: z.string(),
});

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
