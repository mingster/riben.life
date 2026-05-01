import { resolveSupportEmailFromPlatformSettingsJson } from "@/lib/platform-settings/resolve-support-email-from-platform-settings-json";
import { sqlClient } from "@/lib/prismadb";
import type { StoreOrder, User } from "@/types";
import type { StringNVType } from "@/types/enum";
import { epochToDate, formatDateTime } from "@/utils/datetime-utils";

// Cache for database queries to avoid repeated calls
const queryCache = new Map<string, any>();

interface TagReplacement {
	pattern: RegExp;
	value: string;
}

// Phase tags in the message
//
export async function PhaseTags(
	messageToBePhased: string,
	_customer?: User | null,
	order?: StoreOrder | null,
	user?: User | null,
): Promise<string> {
	let result = messageToBePhased;

	// Collect all replacements in a single pass
	const replacements: TagReplacement[] = [];

	// replacements from platform settings (KV + mustache support email)
	const platformSettings = await sqlClient.platformSettings.findFirst();
	let settingsKV: StringNVType[] = [];
	if (platformSettings?.settings != null) {
		try {
			settingsKV = JSON.parse(
				String(platformSettings.settings),
			) as StringNVType[];
		} catch {
			settingsKV = [];
		}
	}

	const supportEmailResolved = resolveSupportEmailFromPlatformSettingsJson(
		platformSettings?.settings != null
			? String(platformSettings.settings)
			: undefined,
	);
	result = result.replace(/\{\{support\.email\}\}/gi, supportEmailResolved);
	replacements.push({
		pattern: /%Support\.Email%/gi,
		value: supportEmailResolved,
	});

	const appName = settingsKV.find((item) => item.label === "App.Name");
	if (appName) {
		replacements.push({ pattern: /%App\.Name%/gi, value: appName.value });
	}

	// Early return if no legacy percent-tags left to process
	if (!result.includes("%")) {
		return result;
	}

	/*
	replacements.push(
		{ pattern: /%Support\.Email%/gi, value: "support@riben.life
		{ pattern: /%App\.Name%/gi, value: "riben.life" },
	);
	*/

	// User data replacements (highest priority)
	if (user) {
		replacements.push(
			{ pattern: /%Customer\.Email%/gi, value: user.email || "" },
			{ pattern: /%Customer\.FullName%/gi, value: user.name || "" },
			{ pattern: /%Customer\.Username%/gi, value: user.email || "" },
			{
				pattern: /%Customer\.CustomerId%/gi,
				value: user.id || "",
			},
		);
	}

	// Order data replacements
	if (order) {
		// Parallel database queries for better performance
		const [orderCustomer] = await Promise.allSettled([
			getCachedCustomer(order.User?.id || ""),
		]);

		replacements.push(
			{ pattern: /%Order\.OrderId%/gi, value: order.id?.toString() || "" },
			{ pattern: /%Order\.OrderNumber%/gi, value: order.id || "" },
			{
				pattern: /%Order\.CreatedOn%/gi,
				value:
					formatDateTime(
						(() => {
							const ca = order.createdAt;
							if (ca == null) return new Date();
							if (typeof ca === "bigint") return epochToDate(ca) ?? new Date();
							if (typeof ca === "number")
								return epochToDate(BigInt(ca)) ?? new Date();
							return ca;
						})(),
					) || "",
			},
			{
				pattern: /%Order\.CustomerFullName%/gi,
				value:
					orderCustomer.status === "fulfilled"
						? orderCustomer.value?.name || ""
						: "",
			},
		);
	}

	// Apply all replacements in a single pass
	return replacements.reduce((text, replacement) => {
		return text.replace(replacement.pattern, replacement.value);
	}, result);
}

// Helper functions for caching database queries
async function getCachedCustomer(customerId: string) {
	const cacheKey = `customer_${customerId}`;

	if (queryCache.has(cacheKey)) {
		return queryCache.get(cacheKey);
	}

	const customer = await sqlClient.user.findUnique({
		where: { id: customerId },
	});

	queryCache.set(cacheKey, customer);

	// Clear cache after 5 minutes to prevent memory leaks
	setTimeout(() => queryCache.delete(cacheKey), 5 * 60 * 1000);

	return customer;
}
// Utility function to clear cache (useful for testing or manual cache management)
export function clearPhaseTagsCache(): void {
	queryCache.clear();
}
