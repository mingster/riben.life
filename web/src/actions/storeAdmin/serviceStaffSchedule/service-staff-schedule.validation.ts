import { z } from "zod";

/**
 * Validation schema for creating a service staff facility schedule.
 */
export const createServiceStaffScheduleSchema = z.object({
	serviceStaffId: z.string().min(1, "Service staff ID is required"),
	facilityId: z.string().optional().nullable(), // null = default schedule for all facilities
	businessHours: z.string().min(1, "Business hours are required"),
	effectiveFrom: z.coerce.number().optional().nullable(), // epoch ms
	effectiveTo: z.coerce.number().optional().nullable(), // epoch ms
	isActive: z.boolean().default(true),
	priority: z.coerce.number().int().default(0),
});
export type CreateServiceStaffScheduleInput = z.infer<
	typeof createServiceStaffScheduleSchema
>;

/**
 * Validation schema for updating a service staff facility schedule.
 */
export const updateServiceStaffScheduleSchema = z.object({
	id: z.string().min(1, "Schedule ID is required"),
	facilityId: z.string().optional().nullable(), // null = default schedule for all facilities
	businessHours: z.string().min(1, "Business hours are required"),
	effectiveFrom: z.coerce.number().optional().nullable(), // epoch ms
	effectiveTo: z.coerce.number().optional().nullable(), // epoch ms
	isActive: z.boolean().default(true),
	priority: z.coerce.number().int().default(0),
});
export type UpdateServiceStaffScheduleInput = z.infer<
	typeof updateServiceStaffScheduleSchema
>;

/**
 * Validation schema for deleting a service staff facility schedule.
 */
export const deleteServiceStaffScheduleSchema = z.object({
	id: z.string().min(1, "Schedule ID is required"),
});
export type DeleteServiceStaffScheduleInput = z.infer<
	typeof deleteServiceStaffScheduleSchema
>;

/**
 * Validation schema for getting service staff schedules.
 */
export const getServiceStaffSchedulesSchema = z.object({
	serviceStaffId: z.string().min(1, "Service staff ID is required"),
});
export type GetServiceStaffSchedulesInput = z.infer<
	typeof getServiceStaffSchedulesSchema
>;
