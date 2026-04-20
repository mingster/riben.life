import { cache } from "react";

import { getStoreHomeDataAction } from "@/actions/store/get-store-home-data";

/**
 * Dedupes store-home fetches between `liff/[storeId]/layout.tsx` and `page.tsx`.
 */
export const getCachedLiffStoreHomeData = cache(async (storeId: string) => {
	const result = await getStoreHomeDataAction({ storeId });
	if (result?.serverError || !result?.data) {
		return null;
	}
	return result.data;
});
