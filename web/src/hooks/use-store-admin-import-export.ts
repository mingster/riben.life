"use client";

import { useStoreAdminContext } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/components/store-admin-context";

export function useStoreAdminImportExport() {
	const { store, canImportExport } = useStoreAdminContext();
	return { canImportExport, storeId: store.id };
}
