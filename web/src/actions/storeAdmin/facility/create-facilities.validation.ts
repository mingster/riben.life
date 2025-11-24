import { z } from "zod";

export const createFacilitiesSchema = z.object({
	storeId: z.string().min(1, "storeId is required"),
	prefix: z.string().trim().default(""),
	numOfFacilities: z.coerce.number().int().min(1).max(100),
	capacity: z.coerce.number().int().min(1),
	defaultCost: z.coerce.number().min(0, "Default Cost is required"),
	defaultCredit: z.coerce.number().min(0, "Default Credit is required"),
	defaultDuration: z.coerce
		.number()
		.int()
		.min(0, "Default Duration must be 0 or greater"),
	businessHours: z.string().optional().nullable(),
});
export type CreateFacilitiesInput = z.infer<typeof createFacilitiesSchema>;
