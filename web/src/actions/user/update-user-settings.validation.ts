import { z } from "zod/v4";

export const updateUserSettingsSchema = z.object({
	id: z.string(),
	name: z.string().min(5, {
		error: "name is required",
	}),
	locale: z.string().min(1, {
		error: "locale is required",
	}),
	timezone: z.string().min(1, {
		error: "timezone is required",
	}),
	//useNewWebsite: z.boolean(),
});

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
