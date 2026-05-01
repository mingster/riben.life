import { sqlClient } from "@/lib/prismadb";
import { resolveSupportEmailFromPlatformSettingsJson } from "./resolve-support-email-from-platform-settings-json";

/**
 * Returns the platform support email from `PlatformSettings` KV (`Support.Email`).
 */
export async function getPlatformSupportEmail(): Promise<string> {
	const row = await sqlClient.platformSettings.findFirst();
	return resolveSupportEmailFromPlatformSettingsJson(
		row?.settings != null ? String(row.settings) : undefined,
	);
}
