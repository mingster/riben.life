import { z } from "zod";

export const updateUserSettingsSchema = z.object({
	id: z.string(),
	name: z.string().min(1, { message: "Name is required" }),
	locale: z.string().min(1, { message: "locale is required" }),
	timezone: z.string().min(1, { message: "timezone is required" }),
	phone: z.string().optional(),
});

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
