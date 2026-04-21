import { redirect } from "next/navigation";
import { getStoreHomeDataAction } from "@/actions/store/get-store-home-data";
import { isReservedRoute } from "@/lib/reserved-routes";
import { StoreHomeLanding } from "./components/store-home-landing";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// Store home page - landing page with navigation options
// No redirects on first load - shows landing page with navigation buttons
export default async function StoreHomePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Prevent admin and reserved routes from being treated as customer store pages
	if (isReservedRoute(params.storeId)) {
		redirect("/");
	}

	// Fetch store, RSVP settings, and store settings all at once
	const result = await getStoreHomeDataAction({ storeId: params.storeId });

	if (result?.serverError) {
		redirect("/unv");
	}

	if (!result?.data) {
		redirect("/unv");
	}

	const { store, rsvpSettings, storeSettings, facilities, waitListSettings } =
		result.data;

	const acceptReservation = rsvpSettings.acceptReservation === true;
	const waitlistEnabled = Boolean(waitListSettings?.enabled);

	// Render landing page instead of redirecting
	return (
		<StoreHomeLanding
			store={store}
			rsvpSettings={rsvpSettings}
			storeSettings={storeSettings}
			useOrderSystem={store.useOrderSystem}
			acceptReservation={acceptReservation}
			waitlistEnabled={waitlistEnabled}
			facilities={facilities || []}
		/>
	);
}
