import isProLevel from "@/lib/store/is-pro-level";

/** Import/export requires Pro/Multi level and a non-expired store subscription. */
export async function storeCanImportExport(storeId: string): Promise<boolean> {
	return isProLevel(storeId);
}
