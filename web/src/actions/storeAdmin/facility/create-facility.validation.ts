import { z } from "zod";

export const createFacilitySchema = z.object({
	storeId: z.string().min(1, "storeId is required"),
	facilityName: z.string().trim().min(1, "facilityName is required"),
	capacity: z.coerce.number().int().min(1),
});
