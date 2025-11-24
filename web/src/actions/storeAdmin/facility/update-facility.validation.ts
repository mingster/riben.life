import { z } from "zod";

export const updateFacilitySchema = z.object({
	id: z.string().min(1, "facilityId is required"),
	storeId: z.string().min(1, "storeId is required"),
	facilityName: z.string().trim().min(1, "Facility Name is required"),
	capacity: z.coerce.number().int().min(1, "Capacity is required"),
	defaultCost: z.coerce.number().min(0, "Default Cost is required"),
	defaultCredit: z.coerce.number().min(0, "Default Credit is required"),
	defaultDuration: z.coerce
		.number()
		.int()
		.min(1, "Default Duration is required"),
	businessHours: z.string().optional().nullable(),
});
export type UpdateFacilityInput = z.infer<typeof updateFacilitySchema>;
