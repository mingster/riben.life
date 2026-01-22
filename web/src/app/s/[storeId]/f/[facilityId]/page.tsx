import Container from "@/components/ui/container";
import BusinessHours from "@/lib/businessHours";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { redirect } from "next/navigation";
import getStoreWithProducts from "@/actions/get-store-with-products";
import { formatDate } from "date-fns";
import type { RsvpSettings, StoreSettings } from "@/types";
import { isReservedRoute } from "@/lib/reserved-routes";
import logger from "@/lib/logger";
import { FacilityLanding } from "./components/facility-landing";

type Params = Promise<{ storeId: string; facilityId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// customer scan table QR code, which redirect to this page to place order.
//
export default async function TableOrderPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Prevent admin and reserved routes from being treated as customer store pages
	if (isReservedRoute(params.storeId)) {
		redirect("/");
	}

	// Fetch store, storeSettings, rsvpSettings, and facility in parallel for better performance
	let store: Awaited<ReturnType<typeof getStoreWithProducts>>;
	let storeSettings: StoreSettings | null = null;
	let rsvpSettings: RsvpSettings | null = null;
	let facility: { id: string; facilityName: string } | null = null;

	try {
		// Fetch store first (supports both ID and name)
		store = await getStoreWithProducts(params.storeId);
		// Store is guaranteed to exist here due to getStoreWithProducts throwing if not found
		if (!store) {
			logger.error("Store is null after fetch", {
				metadata: { storeId: params.storeId },
				tags: ["store", "page-load", "error"],
			});
			redirect("/unv");
		}

		// Use the actual store ID for subsequent queries (in case we found by name)
		const actualStoreId = store.id;

		// Fetch settings and facility in parallel
		const [fetchedStoreSettings, fetchedRsvpSettings, fetchedFacility] =
			await Promise.all([
				sqlClient.storeSettings.findFirst({
					where: { storeId: actualStoreId },
				}),
				sqlClient.rsvpSettings.findFirst({
					where: { storeId: actualStoreId },
				}),
				sqlClient.storeFacility.findUnique({
					where: { id: params.facilityId },
					select: { id: true, facilityName: true },
				}),
			]);

		// Assign fetched values
		storeSettings = fetchedStoreSettings;
		rsvpSettings = fetchedRsvpSettings;
		facility = fetchedFacility;

		transformPrismaDataForJson(store);

		// Transform BigInt (epoch timestamps) and Decimal for settings if they exist
		if (rsvpSettings) {
			transformPrismaDataForJson(rsvpSettings);
		}
		if (storeSettings) {
			transformPrismaDataForJson(storeSettings);
		}
	} catch (error) {
		logger.error("Failed to load store or settings", {
			metadata: {
				storeId: params.storeId,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
			tags: ["store", "page-load", "error"],
		});
		// Redirect to homepage or a "store not found" page
		redirect("/unv");
	}

	// Ensure storeSettings exists (should always exist, but handle gracefully)
	if (!storeSettings) {
		logger.warn("Store settings not found", {
			metadata: { storeId: params.storeId },
			tags: ["store", "settings", "warning"],
		});
		// Create a minimal storeSettings object to prevent errors
		storeSettings = {
			storeId: params.storeId,
			businessHours: null,
		} as StoreSettings;
	}

	let closed_descr = "";
	let isStoreOpen = store?.isOpen || false;
	if (store?.useBusinessHours && storeSettings.businessHours !== null) {
		const bizHour = storeSettings.businessHours;
		const businessHours = new BusinessHours(bizHour);

		isStoreOpen = businessHours.isOpenNow();

		const nextOpeningDate = businessHours.nextOpeningDate();
		const nextOpeningHour = businessHours.nextOpeningHour();

		closed_descr = `${formatDate(nextOpeningDate, "yyyy-MM-dd")} ${nextOpeningHour}`;
	}

	// Determine store features
	const useOrderSystem = store.useOrderSystem === true;
	const acceptReservation = rsvpSettings?.acceptReservation === true;

	return (
		<Container>
			<FacilityLanding
				store={store}
				facility={facility}
				rsvpSettings={rsvpSettings}
				storeSettings={storeSettings}
				useOrderSystem={useOrderSystem}
				acceptReservation={acceptReservation}
				isStoreOpen={isStoreOpen}
				closed_descr={closed_descr}
			/>
		</Container>
	);
}
