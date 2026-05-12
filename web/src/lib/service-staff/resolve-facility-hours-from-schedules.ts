/**
 * Pure helpers to resolve {@link ServiceStaffFacilitySchedule} rows into business-hours JSON.
 * Mirrors server logic in service-staff-schedule-utils without Prisma (safe for client bundles).
 */

import { dateToEpoch } from "@/utils/datetime-utils";

/** All days closed — same payload as CLOSED_HOURS in service-staff-schedule-utils.ts */
export const SERVICE_STAFF_SCHEDULE_CLOSED_HOURS_JSON =
	'{"Monday":"closed","Tuesday":"closed","Wednesday":"closed","Thursday":"closed","Friday":"closed","Saturday":"closed","Sunday":"closed"}';

export interface ServiceStaffFacilityScheduleRowInput {
	readonly facilityId: string | null;
	readonly businessHours: string;
	readonly isActive: boolean;
	readonly priority: number;
	readonly effectiveFrom: number | bigint | null | undefined;
	readonly effectiveTo: number | bigint | null | undefined;
}

function toEpochMs(value: number | bigint | null | undefined): number | null {
	if (value === null || value === undefined) return null;
	return typeof value === "bigint" ? Number(value) : value;
}

/** Rows that are active and valid for slotUtc per effectiveFrom / effectiveTo. */
export function filterServiceStaffSchedulesApplicableAtUtc(
	schedules: readonly ServiceStaffFacilityScheduleRowInput[],
	slotUtc: Date,
): ServiceStaffFacilityScheduleRowInput[] {
	const checkEpoch = dateToEpoch(slotUtc);
	if (checkEpoch === null || checkEpoch === undefined) {
		return [];
	}
	const t = Number(checkEpoch);
	return schedules.filter((row) => {
		if (!row.isActive) {
			return false;
		}
		const from = toEpochMs(row.effectiveFrom);
		const toMs = toEpochMs(row.effectiveTo);
		if (from !== null && t < from) {
			return false;
		}
		if (toMs !== null && t > toMs) {
			return false;
		}
		return true;
	});
}

function pickHighestPriority(
	rows: ServiceStaffFacilityScheduleRowInput[],
): ServiceStaffFacilityScheduleRowInput | null {
	if (rows.length === 0) {
		return null;
	}
	return rows.reduce((best, row) =>
		row.priority > best.priority ? row : best,
	);
}

/**
 * If the staff has at least one schedule row applicable at slotUtc, returns resolved hours for the facility
 * (facility-specific → default → closed). Otherwise returns undefined so the caller uses facility/RSVP/store hours.
 */
export function getServiceStaffFacilityHoursJsonForSlot(
	schedules: readonly ServiceStaffFacilityScheduleRowInput[],
	facilityId: string,
	slotUtc: Date,
): string | undefined {
	const applicable = filterServiceStaffSchedulesApplicableAtUtc(
		schedules,
		slotUtc,
	);
	if (applicable.length === 0) {
		return undefined;
	}

	const forFacility = applicable.filter((row) => row.facilityId === facilityId);
	const facilityPick = pickHighestPriority(forFacility);
	if (facilityPick) {
		return facilityPick.businessHours;
	}

	const defaults = applicable.filter((row) => row.facilityId === null);
	const defaultPick = pickHighestPriority(defaults);
	if (defaultPick) {
		return defaultPick.businessHours;
	}

	return SERVICE_STAFF_SCHEDULE_CLOSED_HOURS_JSON;
}
