"use client";

import { createContext, useContext, type ReactNode } from "react";

const CustomerStoreBasePathContext = createContext<string | null>(null);

export function CustomerStoreBasePathProvider({
	value,
	children,
}: {
	value: string;
	children: ReactNode;
}) {
	return (
		<CustomerStoreBasePathContext.Provider value={value}>
			{children}
		</CustomerStoreBasePathContext.Provider>
	);
}

export function useCustomerStoreBasePath(): string | null {
	return useContext(CustomerStoreBasePathContext);
}

/**
 * LIFF layout sets context; public `/s/…` routes fall back to `/s/{canonicalStoreId}`.
 */
export function useResolvedCustomerStoreBasePath(
	canonicalStoreId: string,
): string {
	const fromContext = useCustomerStoreBasePath();
	return fromContext ?? `/s/${canonicalStoreId}`;
}
