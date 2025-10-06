import { sqlClient } from "@/lib/prismadb";
import { StoreOrder, User } from "@/types";
import { StringNVType } from "@/types/enum";
import { formatDateTime } from "@/utils/datetime-utils";

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
	customer?: User | null,
	order?: StoreOrder | null,
	user?: User | null,
): Promise<string> {
	const result = messageToBePhased;

	// Early return if no replacements needed
	if (!messageToBePhased.includes("%")) {
		return result;
	}

	// Collect all replacements in a single pass
	const replacements: TagReplacement[] = [];

	// replacements from platform settings
	const platformSettings = await sqlClient.platformSettings.findFirst();
	if (platformSettings) {
		const settingsKV = JSON.parse(
			platformSettings.settings as string,
		) as StringNVType[];

		const appName = settingsKV.find((item) => item.label === "App.Name");
		if (appName) {
			replacements.push({ pattern: /%App\.Name%/gi, value: appName.value });
		}
		const supportEmail = settingsKV.find(
			(item) => item.label === "Support.Email",
		);
		if (supportEmail) {
			replacements.push({
				pattern: /%Support\.Email%/gi,
				value: supportEmail.value,
			});
		}
	}

	/*
	replacements.push(
		{ pattern: /%Support\.Email%/gi, value: "support@5ik.tv" },
		{ pattern: /%App\.Name%/gi, value: "5ik.TV" },
	);
	*/

	// User data replacements (highest priority)
	if (user) {
		replacements.push(
			{ pattern: /%Customer\.Email%/gi, value: user.email || "" },
			{ pattern: /%Customer\.FullName%/gi, value: user.fullName || "" },
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
			getCachedCustomer(order.CustomerID),
		]);

		replacements.push(
			{ pattern: /%Order\.OrderId%/gi, value: order.OrderID?.toString() || "" },
			{ pattern: /%Order\.OrderNumber%/gi, value: order.OrderID || "" },
			{
				pattern: /%Order\.CreatedOn%/gi,
				value: formatDateTime(order.CreatedOn) || "",
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
