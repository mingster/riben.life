import { z } from "zod";

export const generateReserveWithGoogleFeedSchema = z.object({
	environment: z.enum(["sandbox", "production"]).default("sandbox"),
	externalTrackingId: z.string().trim().optional(),
});

export type GenerateReserveWithGoogleFeedInput = z.infer<
	typeof generateReserveWithGoogleFeedSchema
>;
