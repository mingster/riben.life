import { transformPrismaDataForJson } from "@/utils/utils";
import { redirect } from "next/navigation";
import getStoreWithProducts from "@/actions/get-store-with-products";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { isReservedRoute } from "@/lib/reserved-routes";
import { StoreHomeLanding } from "./components/store-home-landing";
import type { Store, RsvpSettings } from "@/types";

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

	// Fetch store and RSVP settings in parallel
	const [store, rsvpSettings] = await Promise.all([
		getStoreWithProducts(params.storeId),
		sqlClient.rsvpSettings.findUnique({
			where: { storeId: params.storeId },
		}),
	]);

	// Store is guaranteed to exist here due to getStoreWithProducts throwing if not found
	if (!store) {
		logger.error("Store is null after fetch", {
			metadata: { storeId: params.storeId },
			tags: ["store", "page-load", "error"],
		});
		redirect("/unv");
	}

	transformPrismaDataForJson(store);

	// Transform BigInt (epoch timestamps) and Decimal for settings if they exist
	if (rsvpSettings) {
		transformPrismaDataForJson(rsvpSettings);
	}

	const acceptReservation =
		rsvpSettings && rsvpSettings.acceptReservation === true;

	// Render landing page instead of redirecting
	return (
		<StoreHomeLanding
			store={store as Store}
			rsvpSettings={rsvpSettings as RsvpSettings | null}
			useOrderSystem={store.useOrderSystem}
			acceptReservation={acceptReservation}
		/>
	);
}
