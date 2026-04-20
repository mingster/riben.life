import { z } from "zod";

export const resumeGoogleCalendarSyncSchema = z.object({});

export type ResumeGoogleCalendarSyncInput = z.infer<
	typeof resumeGoogleCalendarSyncSchema
>;
