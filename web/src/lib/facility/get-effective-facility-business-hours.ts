import type { RsvpSettings, StoreFacility } from "@/types";

/**
 * JSON schedule for validating / slot-filtering for a facility.
 * When the facility does not use its own hours, falls back to RSVP hours (if RSVP uses business hours)
 * or store settings hours (when RSVP does not and the store uses business hours).
 */
export function getEffectiveFacilityBusinessHoursJson(
	facility: Pick<StoreFacility, "useOwnBusinessHours" | "businessHours">,
	rsvpSettings:
		| Pick<RsvpSettings, "useBusinessHours" | "rsvpHours">
		| null
		| undefined,
	storeUseBusinessHours: boolean,
	storeSettingsBusinessHours: string | null,
): string | null {
	if (facility.useOwnBusinessHours && facility.businessHours?.trim()) {
		return facility.businessHours;
	}
	const rsvpUsesSchedule = rsvpSettings?.useBusinessHours ?? true;
	if (rsvpUsesSchedule) {
		const h = rsvpSettings?.rsvpHours;
		return h?.trim() ? h : null;
	}
	if (storeUseBusinessHours) {
		return storeSettingsBusinessHours?.trim()
			? storeSettingsBusinessHours
			: null;
	}
	return null;
}
