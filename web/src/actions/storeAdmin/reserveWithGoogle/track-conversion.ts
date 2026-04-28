"use server";

import { z } from "zod";
import { trackReserveWithGoogleConversionEvent } from "@/lib/reserve-with-google";
import { baseClient } from "@/utils/actions/safe-action";

const trackReserveWithGoogleConversionSchema = z.object({
	rsvpId: z.string().min(1),
	storeId: z.string().min(1),
	eventType: z.enum(["created", "confirmed"]),
	source: z.string().nullable(),
	externalSource: z.string().nullable().optional(),
	externalTrackingId: z.string().nullable(),
});

export const trackReserveWithGoogleConversionAction = baseClient
	.metadata({ name: "trackReserveWithGoogleConversion" })
	.schema(trackReserveWithGoogleConversionSchema)
	.action(async ({ parsedInput }) => {
		await trackReserveWithGoogleConversionEvent(parsedInput);
		return { ok: true };
	});
