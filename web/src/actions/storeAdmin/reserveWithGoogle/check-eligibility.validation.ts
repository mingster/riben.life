import { z } from "zod";

export const checkReserveWithGoogleEligibilitySchema = z.object({});

export type CheckReserveWithGoogleEligibilityInput = z.infer<
	typeof checkReserveWithGoogleEligibilitySchema
>;
