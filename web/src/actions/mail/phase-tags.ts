import { pstvDBPrismaClient } from "@/lib/prisma-client-pstv";
import { NopCustomer, NopOrder, User } from "@/types";
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
	customer?: NopCustomer | null,
	order?: NopOrder | null,
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
	const platformSettings =
		await pstvDBPrismaClient.platformSettings.findFirst();
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
		);
	}

	// Customer data replacements
	if (customer) {
		replacements.push(
			{
				pattern: /%Customer\.AffiliateId%/gi,
				value: customer.AffiliateId?.toString() || "",
			},
			{ pattern: /%Customer\.Username%/gi, value: customer.Username || "" },
			{
				pattern: /%Customer\.CustomerId%/gi,
				value: customer.CustomerId?.toString() || "",
			},
			{ pattern: /%Customer\.Email%/gi, value: customer.Email || "" },
			{ pattern: /%Customer\.FullName%/gi, value: customer.FullName || "" },
		);
	}

	// Order data replacements
	if (order) {
		// Parallel database queries for better performance
		const [orderCustomer, pstvSubscriber] = await Promise.allSettled([
			getCachedCustomer(order.CustomerID),
			getCachedSubscriber(order.CustomerID),
		]);

		replacements.push(
			{ pattern: /%Order\.OrderId%/gi, value: order.OrderID?.toString() || "" },
			{ pattern: /%Order\.OrderNumber%/gi, value: order.OrderID || "" },
			{
				pattern: /%Order\.CreatedOn%/gi,
				value: formatDateTime(order.CreatedOn) || "",
			},
			{
				pattern: /%Subscription\.Expiration%/gi,
				value:
					formatDateTime(
						pstvSubscriber.status === "fulfilled"
							? pstvSubscriber.value?.expiration
							: null,
					) || "",
			},
			{
				pattern: /%Order\.CustomerFullName%/gi,
				value:
					orderCustomer.status === "fulfilled"
						? orderCustomer.value?.FullName || ""
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
async function getCachedCustomer(customerId: number) {
	const cacheKey = `customer_${customerId}`;

	if (queryCache.has(cacheKey)) {
		return queryCache.get(cacheKey);
	}

	const customer = await pstvDBPrismaClient.nop_Customer.findUnique({
		where: { CustomerID: customerId },
	});

	queryCache.set(cacheKey, customer);

	// Clear cache after 5 minutes to prevent memory leaks
	setTimeout(() => queryCache.delete(cacheKey), 5 * 60 * 1000);

	return customer;
}

async function getCachedSubscriber(customerId: number) {
	const cacheKey = `subscriber_${customerId}`;

	if (queryCache.has(cacheKey)) {
		return queryCache.get(cacheKey);
	}

	const subscriber = await pstvDBPrismaClient.pstv_subscriber.findUnique({
		where: { customer_id: customerId },
	});

	queryCache.set(cacheKey, subscriber);

	// Clear cache after 5 minutes to prevent memory leaks
	setTimeout(() => queryCache.delete(cacheKey), 5 * 60 * 1000);

	return subscriber;
}

// Utility function to clear cache (useful for testing or manual cache management)
export function clearPhaseTagsCache(): void {
	queryCache.clear();
}
