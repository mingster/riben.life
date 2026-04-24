import { getStoreHomeDataAction } from "@/actions/store/get-store-home-data";
import { Loader } from "@/components/loader";
import { getCustomerStoreBasePath } from "@/lib/customer-store-base-path";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RsvpMode } from "@/types/enum";
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

	const { store, rsvpSettings, storeSettings, facilities, serviceStaff } =
		result.data;
	const acceptReservation = rsvpSettings.acceptReservation === true;

	if (
		acceptReservation &&
		Number(rsvpSettings.rsvpMode) === RsvpMode.RESTAURANT
	) {
		const customerBase = await getCustomerStoreBasePath(params.storeId);
		redirect(`${customerBase}/reservation/open`);
	}

	return (
		<Suspense fallback={<Loader />}>
			<ClientReservation
				store={store}
				rsvpSettings={rsvpSettings}
				storeSettings={storeSettings}
				useOrderSystem={store.useOrderSystem}
				acceptReservation={acceptReservation}
				facilities={facilities || []}
				serviceStaff={serviceStaff ?? []}
			/>
		</Suspense>
	);
}
