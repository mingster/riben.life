import { sqlClient } from "@/lib/prismadb";
import { resolveAppNameFromPlatformSettingsJson } from "./resolve-app-name-from-platform-settings-json";

/**
 * Returns the platform display name from `PlatformSettings` KV (`App.Name`).
 */
export async function getPlatformAppName(): Promise<string> {
	const row = await sqlClient.platformSettings.findFirst();
	return resolveAppNameFromPlatformSettingsJson(
		row?.settings != null ? String(row.settings) : undefined,
	);
}
