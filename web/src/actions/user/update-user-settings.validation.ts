import { z } from "zod/v4";

export const updateUserSettingsSchema = z.object({
	id: z.string(),
	name: z.string().min(5, { message: "name is required" }),
	locale: z.string().min(1, { message: "locale is required" }),
	timezone: z.string().min(1, { message: "timezone is required" }),
});

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
