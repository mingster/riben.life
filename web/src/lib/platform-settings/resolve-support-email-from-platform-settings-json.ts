import type { StringNVType } from "@/types/enum";

export const FALLBACK_PLATFORM_SUPPORT_EMAIL = "support@riben.life";

/**
 * Resolves support email from the raw `PlatformSettings.settings` JSON string.
 * Pure function (no database) — safe to import in unit tests without `DATABASE_URL`.
 */
export function resolveSupportEmailFromPlatformSettingsJson(
	settingsJson: string | null | undefined,
): string {
	if (!settingsJson) {
		return FALLBACK_PLATFORM_SUPPORT_EMAIL;
	}
	try {
		const settingsKV = JSON.parse(settingsJson) as StringNVType[];
		const entry = settingsKV.find((item) => item.label === "Support.Email");
		const value = entry?.value?.trim();
		return value && value.length > 0 ? value : FALLBACK_PLATFORM_SUPPORT_EMAIL;
	} catch {
		return FALLBACK_PLATFORM_SUPPORT_EMAIL;
	}
}
