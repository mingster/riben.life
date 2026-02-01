/**
 * Service Staff Facility Schedule Utilities
 *
 * This module provides utilities to resolve service staff business hours
 * based on facility-specific schedules.
 *
 * Resolution Logic (per DESIGN-SERVICE-STAFF-FACILITY-AVAILABILITY.md):
 * 1. If staff has any entry in ServiceStaffFacilitySchedule → staff only available at set schedules
 *    - Check for specific facility + staff combination (when facilityId provided)
 *    - If not found, staff is NOT available at that facility (return closed hours)
 *    - Check for default schedule (facilityId = null) when no facility-specific match
 * 2. If staff has NO entries in ServiceStaffFacilitySchedule → use StoreSettings.businessHours
 */

import { sqlClient } from "@/lib/prismadb";
import { dateToEpoch } from "@/utils/datetime-utils";

/** Business hours JSON meaning "staff not available" (all days closed). Used by checkTimeAgainstBusinessHours. */
const CLOSED_HOURS =
	'{"Monday":"closed","Tuesday":"closed","Wednesday":"closed","Thursday":"closed","Friday":"closed","Saturday":"closed","Sunday":"closed"}';

export interface ServiceStaffSchedule {
	id: string;
	businessHours: string;
	facilityId: string | null;
	facilityName?: string | null;
	isActive: boolean;
	priority: number;
	effectiveFrom: bigint | null;
	effectiveTo: bigint | null;
}

/**
 * Get the effective business hours for a service staff member at a specific facility.
 *
 * @param storeId - Store ID
 * @param serviceStaffId - Service staff ID
 * @param facilityId - Facility ID (null to get default schedule only)
 * @param date - Date to check against effectiveFrom/effectiveTo (optional, defaults to now)
 * @returns Business hours JSON string, CLOSED_HOURS if staff not available, or null if no restrictions
 */
export async function getServiceStaffBusinessHours(
	storeId: string,
	serviceStaffId: string,
	facilityId: string | null,
	date?: Date,
): Promise<string | null> {
	const checkDate = date || new Date();
	const checkEpoch = dateToEpoch(checkDate);

	// Build where clause for temporal validity (only when we have a valid epoch)
	const temporalWhere =
		checkEpoch != null
			? {
					OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: checkEpoch } }],
					AND: [
						{
							OR: [{ effectiveTo: null }, { effectiveTo: { gte: checkEpoch } }],
						},
					],
				}
			: {};

	// 1. Check if staff has ANY schedule in ServiceStaffFacilitySchedule
	const staffHasSchedules = await sqlClient.serviceStaffFacilitySchedule.count({
		where: {
			storeId,
			serviceStaffId,
			isActive: true,
			...temporalWhere,
		},
	});

	if (staffHasSchedules > 0) {
		// Staff has schedules → staff only available at their set schedules
		// 1a. If facilityId provided: check facility + staff combination first, then default schedule
		if (facilityId) {
			const facilitySchedule =
				await sqlClient.serviceStaffFacilitySchedule.findFirst({
					where: {
						storeId,
						serviceStaffId,
						facilityId,
						isActive: true,
						...temporalWhere,
					},
					orderBy: { priority: "desc" },
					select: { businessHours: true },
				});
			if (facilitySchedule) {
				return facilitySchedule.businessHours;
			}
			// No facility-specific schedule → try default (facilityId = null)
			const defaultSchedule =
				await sqlClient.serviceStaffFacilitySchedule.findFirst({
					where: {
						storeId,
						serviceStaffId,
						facilityId: null,
						isActive: true,
						...temporalWhere,
					},
					orderBy: { priority: "desc" },
					select: { businessHours: true },
				});
			if (defaultSchedule) {
				return defaultSchedule.businessHours;
			}
			// No facility-specific nor default found → staff not available at this facility
			return CLOSED_HOURS;
		}

		// 1b. facilityId null: check default schedule only
		const defaultSchedule =
			await sqlClient.serviceStaffFacilitySchedule.findFirst({
				where: {
					storeId,
					serviceStaffId,
					facilityId: null,
					isActive: true,
					...temporalWhere,
				},
				orderBy: { priority: "desc" },
				select: { businessHours: true },
			});
		if (defaultSchedule) {
			return defaultSchedule.businessHours;
		}
		// Staff has only facility-specific schedules, no default → not available when no facility selected
		return CLOSED_HOURS;
	}

	// 2. Staff has NO schedules → use StoreSettings.businessHours
	const storeSettings = await sqlClient.storeSettings.findFirst({
		where: { storeId },
		select: { businessHours: true },
	});
	if (storeSettings?.businessHours) {
		return storeSettings.businessHours;
	}

	// No store hours defined → no restrictions (staff always available)
	return null;
}

/**
 * Get all schedules for a service staff member.
 *
 * @param storeId - Store ID
 * @param serviceStaffId - Service staff ID
 * @returns Array of schedules with facility info
 */
export async function getServiceStaffAllSchedules(
	storeId: string,
	serviceStaffId: string,
): Promise<ServiceStaffSchedule[]> {
	const schedules = await sqlClient.serviceStaffFacilitySchedule.findMany({
		where: {
			storeId,
			serviceStaffId,
		},
		include: {
			Facility: {
				select: {
					facilityName: true,
				},
			},
		},
		orderBy: [{ facilityId: "asc" }, { priority: "desc" }],
	});

	return schedules.map((s) => ({
		id: s.id,
		businessHours: s.businessHours,
		facilityId: s.facilityId,
		facilityName: s.Facility?.facilityName || null,
		isActive: s.isActive,
		priority: s.priority,
		effectiveFrom: s.effectiveFrom,
		effectiveTo: s.effectiveTo,
	}));
}

/**
 * Check if a service staff member has any schedule defined.
 *
 * @param storeId - Store ID
 * @param serviceStaffId - Service staff ID
 * @returns True if at least one schedule exists
 */
export async function hasServiceStaffSchedule(
	storeId: string,
	serviceStaffId: string,
): Promise<boolean> {
	const count = await sqlClient.serviceStaffFacilitySchedule.count({
		where: {
			storeId,
			serviceStaffId,
			isActive: true,
		},
	});

	return count > 0;
}

/**
 * Get the default schedule for a service staff member (facilityId = null).
 *
 * @param storeId - Store ID
 * @param serviceStaffId - Service staff ID
 * @returns Default schedule or null
 */
export async function getServiceStaffDefaultSchedule(
	storeId: string,
	serviceStaffId: string,
): Promise<ServiceStaffSchedule | null> {
	const schedule = await sqlClient.serviceStaffFacilitySchedule.findFirst({
		where: {
			storeId,
			serviceStaffId,
			facilityId: null,
			isActive: true,
		},
		orderBy: { priority: "desc" },
	});

	if (!schedule) return null;

	return {
		id: schedule.id,
		businessHours: schedule.businessHours,
		facilityId: null,
		facilityName: null,
		isActive: schedule.isActive,
		priority: schedule.priority,
		effectiveFrom: schedule.effectiveFrom,
		effectiveTo: schedule.effectiveTo,
	};
}
