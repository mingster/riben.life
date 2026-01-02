import { z } from "zod";

export const deleteServiceStaffSchema = z.object({
	id: z.string().min(1, "ServiceStaff ID is required"),
});

export type DeleteServiceStaffInput = z.infer<typeof deleteServiceStaffSchema>;
