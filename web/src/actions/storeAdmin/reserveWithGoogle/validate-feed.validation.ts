import { z } from "zod";

export const validateReserveWithGoogleFeedSchema = z.object({
	environment: z.enum(["sandbox", "production"]).default("sandbox"),
});

export type ValidateReserveWithGoogleFeedInput = z.infer<
	typeof validateReserveWithGoogleFeedSchema
>;
