import { getEffectiveFacilityBusinessHoursJson } from "@/lib/facility/get-effective-facility-business-hours";
import type { Rsvp, RsvpSettings, StoreFacility, StoreSettings } from "@/types";
import { RsvpMode, RsvpStatus } from "@/types/enum";
import { dateToEpoch } from "@/utils/datetime-utils";
import {
	getServiceStaffFacilityHoursJsonForSlot,
	type ServiceStaffFacilityScheduleRowInput,
} from "@/lib/service-staff/resolve-facility-hours-from-schedules";
import {
	checkTimeAgainstBusinessHours,
	rsvpTimeToEpoch,
} from "@/lib/reservation/utils";

/** When `facility_rsvp_only`, facility hours apply only if `rsvpMode === FACILITY`. Use `always` to enforce facility hours regardless of mode (e.g. personnel facility picker). */
export type FacilityHoursPolicy = "always" | "facility_rsvp_only";

export interface FilterFacilitiesAvailableAtRsvpSlotParams {
	readonly facilities: StoreFacility[];
	readonly slotUtc: Date | null | undefined;
	readonly storeTimezone: string;
	readonly rsvpSettings: RsvpSettings | null | undefined;
	readonly storeUseBusinessHours: boolean;
	readonly storeBusinessHours: StoreSettings["businessHours"];
	readonly existingReservations: readonly Rsvp[];
	readonly excludeReservationId?: string | null;
	readonly facilityHoursPolicy: FacilityHoursPolicy;
	readonly rsvpMode: number;
	/**
	 * When set (e.g. personnel booking with prefilled staff), facility open/closed follows
	 * {@link ServiceStaffFacilitySchedule} before falling back to facility/RSVP hours.
	 */
	readonly serviceStaffFacilitySchedules?:
		| readonly ServiceStaffFacilityScheduleRowInput[]
		| undefined;
}

/**
 * Filters facilities that are open at the slot time (optional, by policy) and not blocked by
 * overlapping reservations / single-service rules — same rules as the reservation form facility list.
 */
export function filterFacilitiesAvailableAtRsvpSlot(
	params: FilterFacilitiesAvailableAtRsvpSlotParams,
): StoreFacility[] {
	const {
		facilities,
		slotUtc,
		storeTimezone,
		rsvpSettings,
		storeUseBusinessHours,
		storeBusinessHours,
		existingReservations,
		excludeReservationId,
		facilityHoursPolicy,
		rsvpMode,
		serviceStaffFacilitySchedules,
	} = params;

	if (!facilities.length) {
		return [];
	}

	if (!slotUtc || Number.isNaN(slotUtc.getTime())) {
		return [...facilities];
	}

	const shouldCheckFacilityHours =
		facilityHoursPolicy === "always" ||
		(facilityHoursPolicy === "facility_rsvp_only" &&
			rsvpMode === RsvpMode.FACILITY);

	let filtered = facilities.filter((facility) => {
		if (!shouldCheckFacilityHours) {
			return true;
		}

		let facilityHours: string | null | undefined;

		const staffRows = serviceStaffFacilitySchedules;
		if (staffRows && staffRows.length > 0) {
			facilityHours = getServiceStaffFacilityHoursJsonForSlot(
				staffRows,
				facility.id,
				slotUtc,
			);
		}

		if (facilityHours === undefined) {
			facilityHours = getEffectiveFacilityBusinessHoursJson(
				facility,
				rsvpSettings,
				storeUseBusinessHours === true,
				storeBusinessHours ?? null,
			);
		}
		if (!facilityHours) {
			return true;
		}

		const result = checkTimeAgainstBusinessHours(
			facilityHours,
			slotUtc,
			storeTimezone,
		);
		return result.isValid;
	});

	const singleServiceMode = rsvpSettings?.singleServiceMode ?? false;
	const defaultDuration = rsvpSettings?.defaultDuration ?? 60;

	const rsvpTimeEpoch = dateToEpoch(slotUtc);
	if (!rsvpTimeEpoch) {
		return filtered;
	}

	const durationMs = defaultDuration * 60 * 1000;
	const slotStart = Number(rsvpTimeEpoch);
	const slotEnd = slotStart + durationMs;

	const existingFacilityIds = new Set(
		existingReservations
			.filter((r) => {
				if (excludeReservationId && r.id === excludeReservationId) {
					return false;
				}
				if (r.status === RsvpStatus.Cancelled) {
					return false;
				}

				const existingRsvpTime = rsvpTimeToEpoch(r.rsvpTime);
				if (!existingRsvpTime) {
					return false;
				}

				const existingStart = Number(existingRsvpTime);
				const timeDiff = Math.abs(slotStart - existingStart);
				const oneDayMs = 24 * 60 * 60 * 1000;
				if (timeDiff >= oneDayMs) {
					return false;
				}

				const existingDuration = r.Facility?.defaultDuration ?? defaultDuration;
				const existingDurationMs = existingDuration * 60 * 1000;
				const existingEnd = existingStart + existingDurationMs;

				return slotStart < existingEnd && slotEnd > existingStart;
			})
			.map((r) => r.facilityId)
			.filter((id): id is string => Boolean(id)),
	);

	filtered = filtered.filter(
		(facility) => !existingFacilityIds.has(facility.id),
	);

	const conflictingReservations = existingReservations.filter(
		(existingRsvp) => {
			if (excludeReservationId && existingRsvp.id === excludeReservationId) {
				return false;
			}
			if (existingRsvp.status === RsvpStatus.Cancelled) {
				return false;
			}

			const existingRsvpTime = rsvpTimeToEpoch(existingRsvp.rsvpTime);
			if (!existingRsvpTime) {
				return false;
			}

			const existingStart = Number(existingRsvpTime);
			const existingDuration =
				existingRsvp.Facility?.defaultDuration ?? defaultDuration;
			const existingDurationMs = existingDuration * 60 * 1000;
			const existingEnd = existingStart + existingDurationMs;

			return slotStart < existingEnd && slotEnd > existingStart;
		},
	);

	if (singleServiceMode) {
		if (conflictingReservations.length > 0) {
			filtered = [];
		}
	} else {
		const bookedFacilityIds = new Set(
			conflictingReservations
				.map((r) => r.facilityId)
				.filter((id): id is string => Boolean(id)),
		);

		filtered = filtered.filter(
			(facility) => !bookedFacilityIds.has(facility.id),
		);
	}

	return filtered;
}
