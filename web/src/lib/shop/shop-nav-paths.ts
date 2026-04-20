/**
 * Client-safe paths when the URL has no `storeId` (e.g. global navbar).
 * Uses `NEXT_PUBLIC_DEFAULT_STORE_ID` when set; otherwise falls back to bare `/shop` (resolver).
 *
 * @param suffix - Path after `/shop/[storeId]`, e.g. `/cart`. Empty string → `/shop/[id]` (store home).
 */
export function shopPathWithDefaultStore(suffix: string): string {
	const id = process.env.NEXT_PUBLIC_DEFAULT_STORE_ID?.trim();
	if (!id) {
		return "/shop";
	}
	if (!suffix) {
		return `/shop/${id}`;
	}
	const normalized = suffix.startsWith("/") ? suffix : `/${suffix}`;
	return `/shop/${id}${normalized}`;
}
