import type { RsvpSettings, StoreFacility } from "@/types";

export function getRsvpDefaultBusinessHoursJson(
	rsvpSettings:
		| Pick<RsvpSettings, "useBusinessHours" | "rsvpHours">
		| null
		| undefined,
	storeSettingsBusinessHours: string | null,
): string | null {
	const useStoreBusinessHours = rsvpSettings?.useBusinessHours ?? true;
	if (useStoreBusinessHours) {
		return storeSettingsBusinessHours?.trim()
			? storeSettingsBusinessHours
			: null;
	}

	const rsvpHours = rsvpSettings?.rsvpHours;
	return rsvpHours?.trim() ? rsvpHours : null;
}

/**
 * JSON schedule for validating / slot-filtering for a facility.
 * When the facility does not use its own hours, RSVP settings decide the schedule:
 * useBusinessHours=true uses StoreSettings.businessHours; false uses RsvpSettings.rsvpHours.
 */
export function getEffectiveFacilityBusinessHoursJson(
	facility: Pick<StoreFacility, "useOwnBusinessHours" | "businessHours">,
	rsvpSettings:
		| Pick<RsvpSettings, "useBusinessHours" | "rsvpHours">
		| null
		| undefined,
	_storeUseBusinessHours: boolean,
	storeSettingsBusinessHours: string | null,
): string | null {
	if (facility.useOwnBusinessHours && facility.businessHours?.trim()) {
		return facility.businessHours;
	}

	return getRsvpDefaultBusinessHoursJson(
		rsvpSettings,
		storeSettingsBusinessHours,
	);
}
