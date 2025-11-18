import { z } from "zod";

export const updateFacilitySchema = z.object({
	storeId: z.string().min(1, "storeId is required"),
	id: z.string().min(1, "facilityId is required"),
	facilityName: z.string().trim().min(1, "facilityName is required"),
	capacity: z.coerce.number().int().min(1),
});
