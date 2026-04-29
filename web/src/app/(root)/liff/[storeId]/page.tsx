import { notFound, redirect } from "next/navigation";

import { LiffStoreHome } from "@/app/(root)/liff/components/liff-store-home";
import { isReservedRoute } from "@/lib/reserved-routes";

import { getCachedLiffStoreHomeData } from "./get-cached-liff-store-home-data";

type Params = Promise<{ storeId: string }>;

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

	const {
		store,
		rsvpSettings,
		storeSettings,
		facilities,
		waitListSettings,
		serviceStaff,
	} = data;
	const acceptReservation = rsvpSettings.acceptReservation === true;

	return (
		<LiffStoreHome
			store={store}
			rsvpSettings={rsvpSettings}
			storeSettings={storeSettings}
			waitListSettings={waitListSettings}
			useOrderSystem={store.useOrderSystem}
			acceptReservation={acceptReservation}
			facilities={facilities ?? []}
			serviceStaff={serviceStaff ?? []}
		/>
	);
}
