import type { StringNVType } from "@/types/enum";

export const FALLBACK_PLATFORM_APP_NAME = "riben.life";

/**
 * Resolves app display name from the raw `PlatformSettings.settings` JSON string.
 * Pure function (no database) — safe to import in unit tests without `DATABASE_URL`.
 */
export function resolveAppNameFromPlatformSettingsJson(
	settingsJson: string | null | undefined,
): string {
	if (!settingsJson) {
		return FALLBACK_PLATFORM_APP_NAME;
	}
	try {
		const settingsKV = JSON.parse(settingsJson) as StringNVType[];
		const entry = settingsKV.find((item) => item.label === "App.Name");
		const value = entry?.value?.trim();
		return value && value.length > 0 ? value : FALLBACK_PLATFORM_APP_NAME;
	} catch {
		return FALLBACK_PLATFORM_APP_NAME;
	}
}
