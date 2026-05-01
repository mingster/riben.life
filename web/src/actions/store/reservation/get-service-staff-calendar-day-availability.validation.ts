import { z } from "zod";

const dayKeyRegex = /^\d{4}-\d{2}-\d{2}$/;

export const getServiceStaffCalendarDayAvailabilitySchema = z.object({
	storeId: z.string().min(1),
	serviceStaffId: z.string().min(1),
	facilityId: z.string().min(1),
	storeTimezone: z.string().min(1),
	dayKeys: z
		.array(z.string().regex(dayKeyRegex, "Invalid day key"))
		.min(1)
		.max(45),
});

export type GetServiceStaffCalendarDayAvailabilityInput = z.infer<
	typeof getServiceStaffCalendarDayAvailabilitySchema
>;
