import { notFound, redirect } from "next/navigation";

import { isReservedRoute } from "@/lib/reserved-routes";

import { LiffStoreHome } from "../components/liff-store-home";
import { getCachedLiffStoreHomeData } from "./get-cached-liff-store-home-data";

type Params = Promise<{ storeId: string }>;

/**
 * Store-scoped LIFF customer home. Data matches the public store landing; shell + nav live in `layout.tsx`.
 */
export default async function LiffStoreBootstrapPage(props: {
	params: Params;
}) {
	const { storeId: rawStoreId } = await props.params;
	const storeId = rawStoreId?.trim() ?? "";

	if (!storeId || isReservedRoute(storeId)) {
		notFound();
	}

	const data = await getCachedLiffStoreHomeData(storeId);
	if (!data) {
		redirect("/unv");
	}

	const { store, rsvpSettings, storeSettings, facilities } = data;
	const acceptReservation = rsvpSettings.acceptReservation === true;

	return (
		<LiffStoreHome
			store={store}
			rsvpSettings={rsvpSettings}
			storeSettings={storeSettings}
			useOrderSystem={store.useOrderSystem}
			acceptReservation={acceptReservation}
			facilities={facilities ?? []}
		/>
	);
}
