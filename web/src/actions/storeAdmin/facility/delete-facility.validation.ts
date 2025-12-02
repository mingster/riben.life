import { z } from "zod";

export const deleteFacilitySchema = z.object({
	id: z.string().min(1, "facilityId is required"),
});
