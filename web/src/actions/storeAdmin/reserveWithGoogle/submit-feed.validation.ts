import { z } from "zod";

export const submitReserveWithGoogleFeedSchema = z.object({
	environment: z.enum(["sandbox", "production"]).default("sandbox"),
});

export type SubmitReserveWithGoogleFeedInput = z.infer<
	typeof submitReserveWithGoogleFeedSchema
>;
