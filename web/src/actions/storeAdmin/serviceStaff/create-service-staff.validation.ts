import { z } from "zod";

export const createServiceStaffSchema = z.object({
	userId: z.string().min(1, "User is required"),
	memberRole: z.string().min(1, "Member role is required"),
	capacity: z.coerce.number().int().min(1, "Capacity is required"),
	defaultCost: z.coerce.number().min(0, "Default Cost is required"),
	defaultCredit: z.coerce.number().min(0, "Default Credit is required"),
	defaultDuration: z.coerce
		.number()
		.int()
		.min(0, "Default Duration must be 0 or greater"),
	businessHours: z.string().optional().nullable(),
	description: z.string().optional().nullable(),
});
export type CreateServiceStaffInput = z.infer<typeof createServiceStaffSchema>;
