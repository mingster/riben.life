/**
 * Reserved route names that should not be treated as store IDs
 *
 * These routes are protected from being interpreted as dynamic [storeId] parameters
 * in the s route group. This prevents conflicts with application routes.
 */
export const RESERVED_STORE_ROUTES = [
	"undefined",
	"null",
	"storeAdmin",
	"sysAdmin",
	"api",
	"auth",
	"signin",
	"signIn", // Include both cases for compatibility
	"account",
	"checkout",
	"order",
	"orders",
	"privacy",
	"terms",
	"unv",
	"refund",
	"_next",
	"favicon.ico",
] as const;

/**
 * Check if a given storeId is a reserved route
 *
 * @param storeId - The store ID to check
 * @returns true if the storeId is reserved, false otherwise
 */
export function isReservedRoute(storeId: string): boolean {
	if (!storeId || storeId === "") return true;

	const lowerStoreId = storeId.toLowerCase();

	// Check if it's in the reserved routes list (case-insensitive)
	if (
		RESERVED_STORE_ROUTES.some((route) => route.toLowerCase() === lowerStoreId)
	) {
		return true;
	}

	// Check if it starts with reserved prefixes
	if (
		storeId.startsWith("storeAdmin") ||
		storeId.startsWith("sysAdmin") ||
		storeId.startsWith("_")
	) {
		return true;
	}

	return false;
}
