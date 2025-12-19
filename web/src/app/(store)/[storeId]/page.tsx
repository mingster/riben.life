import { transformPrismaDataForJson } from "@/utils/utils";
import { redirect } from "next/navigation";
import getStoreWithProducts from "@/actions/get-store-with-products";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { isReservedRoute } from "@/lib/reserved-routes";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreHomePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Prevent admin and reserved routes from being treated as customer store pages
	if (isReservedRoute(params.storeId)) {
		redirect("/");
	}

	// Fetch store first (supports both ID and name)
	const store = await getStoreWithProducts(params.storeId);

	// Store is guaranteed to exist here due to getStoreWithProducts throwing if not found
	if (!store) {
		logger.error("Store is null after fetch", {
			metadata: { storeId: params.storeId },
			tags: ["store", "page-load", "error"],
		});
		redirect("/unv");
	}
	if (store) {
		transformPrismaDataForJson(store);
	}

	const rsvpSettings = await sqlClient.rsvpSettings.findUnique({
		where: { storeId: params.storeId },
	});

	// Transform BigInt (epoch timestamps) and Decimal for settings if they exist
	if (rsvpSettings) {
		transformPrismaDataForJson(rsvpSettings);
	}

	const acceptReservation =
		rsvpSettings && rsvpSettings.acceptReservation === true;
	if (store.useOrderSystem) {
		redirect(`/${store.id}/menu`);
	} else if (acceptReservation) {
		redirect(`/${store.id}/reservation`);
	} else {
		redirect(`/${store.id}/faq`);
	}
}
