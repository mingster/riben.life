import { convertLegacyPercentSyntaxToMustache } from "@/lib/notification/template-migration-compat";
import { resolveSupportEmailFromPlatformSettingsJson } from "@/lib/platform-settings/resolve-support-email-from-platform-settings-json";
import { sqlClient } from "@/lib/prismadb";
import type { StoreOrder, User } from "@/types";
import type { StringNVType } from "@/types/enum";
import { epochToDate, formatDateTime } from "@/utils/datetime-utils";
import type { AuthEmailStoreContext } from "./resolve-store-for-auth-email";

// Cache for database queries to avoid repeated calls
const queryCache = new Map<string, unknown>();

/**
 * Replaces `{{...}}` placeholders in message templates. Legacy `%Token.Path%` in the
 * input is normalized to mustache first (same rules as `convertLegacyPercentSyntaxToMustache`).
 */
export async function PhaseTags(
	messageToBePhased: string,
	_customer?: User | null,
	order?: StoreOrder | null,
	user?: User | null,
	storeContext?: AuthEmailStoreContext | null,
): Promise<string> {
	let result = convertLegacyPercentSyntaxToMustache(messageToBePhased);

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

	const appName = settingsKV.find((item) => item.label === "App.Name");
	const appNameValue = appName?.value ?? "riben.life";
	result = result.replace(/\{\{app\.name\}\}/gi, appNameValue);

	const trimmedStoreName = storeContext?.name?.trim();
	const storeDisplayName =
		trimmedStoreName && trimmedStoreName.length > 0
			? trimmedStoreName
			: appNameValue;
	const storeIdForTags = storeContext?.id?.trim() ?? "";

	result = result.replace(/\{\{store\.name\}\}/gi, storeDisplayName);
	result = result.replace(/\{\{store\.id\}\}/gi, storeIdForTags);

	const userEmail = user?.email ?? "";
	const userName = user?.name ?? "";
	const userId = user?.id ?? "";
	result = result.replace(/\{\{customer\.email\}\}/gi, userEmail);
	result = result.replace(/\{\{customer\.fullName\}\}/gi, userName);
	result = result.replace(/\{\{customer\.username\}\}/gi, userEmail);
	result = result.replace(/\{\{customer\.customerId\}\}/gi, userId);

	if (order) {
		const [orderCustomer] = await Promise.allSettled([
			getCachedCustomer(order.User?.id || ""),
		]);

		const createdAtDate = (() => {
			const ca = order.createdAt;
			if (ca == null) return new Date();
			if (typeof ca === "bigint") return epochToDate(ca) ?? new Date();
			if (typeof ca === "number") return epochToDate(BigInt(ca)) ?? new Date();
			return ca;
		})();

		const orderCustomerName =
			orderCustomer.status === "fulfilled"
				? (orderCustomer.value as { name?: string } | null)?.name || ""
				: "";

		result = result.replace(
			/\{\{order\.orderId\}\}/gi,
			order.id?.toString() || "",
		);
		result = result.replace(/\{\{order\.orderNumber\}\}/gi, order.id || "");
		result = result.replace(
			/\{\{order\.createdOn\}\}/gi,
			formatDateTime(createdAtDate) || "",
		);
		result = result.replace(
			/\{\{order\.customerFullName\}\}/gi,
			orderCustomerName,
		);
	}

	return result;
}

async function getCachedCustomer(customerId: string) {
	const cacheKey = `customer_${customerId}`;

	if (queryCache.has(cacheKey)) {
		return queryCache.get(cacheKey);
	}

	const customer = await sqlClient.user.findUnique({
		where: { id: customerId },
	});

	queryCache.set(cacheKey, customer);

	setTimeout(() => queryCache.delete(cacheKey), 5 * 60 * 1000);

	return customer;
}

export function clearPhaseTagsCache(): void {
	queryCache.clear();
}
