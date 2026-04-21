"use client";

import { createContext, type ReactNode, useContext } from "react";

const StoreAdminFullWidthContext = createContext(false);

export function StoreAdminFullWidthProvider({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<StoreAdminFullWidthContext.Provider value={true}>
			{children}
		</StoreAdminFullWidthContext.Provider>
	);
}

/** True when rendering under the store admin dashboard shell (use full-width content, no xl container cap). */
export function useStoreAdminFullWidth(): boolean {
	return useContext(StoreAdminFullWidthContext);
}
