import { headers } from "next/headers";

const RIBEN_CUSTOMER_BASE_HEADER = "x-riben-customer-base";

/**
 * Customer-facing store path prefix for redirects and sign-in callbacks.
 * Under `/liff/[segment]/…`, middleware sets {@link RIBEN_CUSTOMER_BASE_HEADER}; otherwise `/s/{segment}`.
 */
export async function getCustomerStoreBasePath(
	urlStoreSegment: string,
): Promise<string> {
	const headerList = await headers();
	const fromHeader = headerList.get(RIBEN_CUSTOMER_BASE_HEADER);
	if (fromHeader?.startsWith("/liff/")) {
		return fromHeader;
	}
	return `/s/${urlStoreSegment}`;
}
