import { headers } from "next/headers";

const CUSTOMER_STORE_BASE_HEADER = "x-customer-store-base";

/**
 * Customer-facing store path prefix for redirects and sign-in callbacks.
 * Under `/liff/[segment]/…`, middleware may set {@link CUSTOMER_STORE_BASE_HEADER}; otherwise `/s/{segment}`.
 */
export async function getCustomerStoreBasePath(
	urlStoreSegment: string,
): Promise<string> {
	const headerList = await headers();
	const fromHeader = headerList.get(CUSTOMER_STORE_BASE_HEADER);
	if (fromHeader?.startsWith("/liff/")) {
		return fromHeader;
	}
	return `/s/${urlStoreSegment}`;
}
