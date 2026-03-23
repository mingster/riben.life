import type { StoreSettings } from "@/types";

/**
 * Builds a single-line address string for calendar LOCATION fields from store settings.
 */
export function formatStoreCalendarLocation(
	settings: StoreSettings | null | undefined,
): string | undefined {
	if (!settings) {
		return undefined;
	}
	const cityPart = [settings.district, settings.city].filter(Boolean).join(" ");
	const parts = [
		settings.streetLine1,
		settings.streetLine2,
		cityPart || undefined,
		settings.province,
		settings.postalCode,
		settings.country,
	]
		.map((p) => (typeof p === "string" ? p.trim() : ""))
		.filter((p) => p.length > 0);
	return parts.length > 0 ? parts.join(", ") : undefined;
}
