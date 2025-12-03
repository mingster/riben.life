import { z } from "zod";

export const createFacilitySchema = z.object({
	facilityName: z.string().trim().min(1, "Facility Name is required"),
	capacity: z.coerce.number().int().min(1, "capacity is required"),
	defaultCost: z.coerce.number().min(0, "Default Cost is required"),
	defaultCredit: z.coerce.number().min(0, "Default Credit is required"),
	defaultDuration: z.coerce
		.number()
		.int()
		.min(0, "Default Duration must be 0 or greater"),
	businessHours: z.string().optional().nullable(),
	description: z.string().optional().nullable(),
	location: z.string().optional().nullable(),
	travelInfo: z.string().optional().nullable(),
});
export type CreateFacilityInput = z.infer<typeof createFacilitySchema>;
