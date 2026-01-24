import { getStoreHomeDataAction } from "@/actions/store/get-store-home-data";
import { Loader } from "@/components/loader";
import type { Store } from "@/types";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ClientReservation } from "./components/client-reservation";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ReservationPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Fetch store, RSVP settings, and store settings all at once
	const result = await getStoreHomeDataAction({ storeId: params.storeId });

	if (result?.serverError) {
		redirect("/unv");
	}

	if (!result?.data) {
		redirect("/unv");
	}

	const { store, rsvpSettings, storeSettings, facilities } = result.data;
	const acceptReservation = rsvpSettings.acceptReservation === true;

	return (
		<Suspense fallback={<Loader />}>
			<ClientReservation
				store={store as Store}
				rsvpSettings={rsvpSettings}
				storeSettings={storeSettings}
				useOrderSystem={store.useOrderSystem}
				acceptReservation={acceptReservation}
				facilities={facilities || []}
			/>
		</Suspense>
	);
}
