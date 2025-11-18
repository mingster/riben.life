import { z } from "zod";

export const deleteFacilitySchema = z.object({
	storeId: z.string().min(1, "storeId is required"),
	id: z.string().min(1, "facilityId is required"),
});
