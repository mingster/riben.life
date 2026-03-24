import { z } from "zod";

export const updateGoogleCalendarConnectionCalendarSchema = z.object({
	googleCalendarId: z
		.string()
		.min(1, "Calendar is required")
		.max(1024, "Calendar id is too long"),
});

export type UpdateGoogleCalendarConnectionCalendarInput = z.infer<
	typeof updateGoogleCalendarConnectionCalendarSchema
>;
