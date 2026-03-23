import { z } from "zod";

/** No fields; storeId comes from storeActionClient bind args. */
export const getMyGoogleCalendarConnectionSchema = z.object({});

export type GetMyGoogleCalendarConnectionInput = z.infer<
	typeof getMyGoogleCalendarConnectionSchema
>;
