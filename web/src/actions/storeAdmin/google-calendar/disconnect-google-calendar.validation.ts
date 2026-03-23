import { z } from "zod";

export const disconnectGoogleCalendarSchema = z.object({});

export type DisconnectGoogleCalendarInput = z.infer<
	typeof disconnectGoogleCalendarSchema
>;
