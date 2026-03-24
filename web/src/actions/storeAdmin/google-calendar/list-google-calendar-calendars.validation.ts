import { z } from "zod";

/** No fields; storeId comes from storeActionClient bind args. */
export const listGoogleCalendarCalendarsSchema = z.object({});

export type ListGoogleCalendarCalendarsInput = z.infer<
	typeof listGoogleCalendarCalendarsSchema
>;
