import Container from "@/components/ui/container";
import BusinessHours from "@/lib/businessHours";

import { transformPrismaDataForJson } from "@/utils/utils";

import { redirect } from "next/navigation";

import getStoreWithProducts from "@/actions/get-store-with-products";
import { getT } from "@/app/i18n";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { isReservedRoute } from "@/lib/reserved-routes";
import type { StoreWithProductNCategories } from "@/types";
import type { RsvpSettings, StoreSettings } from "@prisma/client";
import { formatDate } from "date-fns";
import { StoreProductList } from "../components/store-product-list";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// allow anonymous or signed-in customer to access online order page.
//
export default async function OnlineOrderPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Prevent admin and reserved routes from being treated as customer store pages
	if (isReservedRoute(params.storeId)) {
		redirect("/");
	}

	// Fetch store, storeSettings, and rsvpSettings in parallel for better performance
	let store: Awaited<ReturnType<typeof getStoreWithProducts>>;
	let storeSettings: StoreSettings | null = null;
	let rsvpSettings: RsvpSettings | null = null;

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

		// Fetch settings in parallel
		const [storeSettings, rsvpSettings] = await Promise.all([
			sqlClient.storeSettings.findFirst({
				where: { storeId: actualStoreId },
			}),
			sqlClient.rsvpSettings.findFirst({
				where: { storeId: actualStoreId },
			}),
		]);

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

	/*
const { t } = await useTranslation(store?.defaultLocale || "en");
<h1>{t("store_closed")}</h1>
<div>
{t("store_next_opening_hours")}
{closed_descr}
</div>
  */

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

	//console.log(`closed_descr: ${closed_descr}`);
	//console.log(`isStoreOpen: ${isStoreOpen}`);
	const { t } = await getT("tw", "translation");

	return (
		<Container>
			{!isStoreOpen ? (
				<>
					<h1>{t("store_closed")}</h1>
					<div>
						{t("store_next_opening_hours")}: {closed_descr}
					</div>
				</>
			) : (
				<StoreProductList
					storeData={store as StoreWithProductNCategories}
					storeSettings={storeSettings as StoreSettings}
				/>
			)}
		</Container>
	);
}
