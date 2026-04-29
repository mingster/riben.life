import { StoreProductList } from "@/app/s/[storeId]/components/store-product-list";
import Container from "@/components/ui/container";
import { getT } from "@/app/i18n";
import getStoreWithProducts from "@/actions/get-store-with-products";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { isReservedRoute } from "@/lib/reserved-routes";
import type { StoreWithProductNCategories } from "@/types";
import type {
	RsvpSettings,
	StoreSettings,
	StoreFacility,
} from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import BusinessHours from "@/lib/businessHours";
import { formatDate } from "date-fns";
import { redirect } from "next/navigation";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * LIFF menu: same product list and ordering UX as `/s/[storeId]/menu`;
 * layout sets `/liff/{storeId}` as customer base path for cart/checkout links.
 */
export default async function LiffStoreMenuPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	if (isReservedRoute(params.storeId)) {
		redirect("/");
	}

	const searchParams = await props.searchParams;
	const facilityId = searchParams.facility
		? typeof searchParams.facility === "string"
			? searchParams.facility
			: searchParams.facility[0]
		: null;

	let store: Awaited<ReturnType<typeof getStoreWithProducts>>;
	let storeSettings: StoreSettings | null = null;
	let rsvpSettings: RsvpSettings | null = null;
	let facility: StoreFacility | null = null;

	try {
		store = await getStoreWithProducts(params.storeId);

		if (!store) {
			logger.error("Store is null after fetch", {
				metadata: { storeId: params.storeId },
				tags: ["store", "page-load", "error"],
			});
			redirect("/unv");
		}

		const actualStoreId = store.id;

		const [storeSettingsResult, rsvpSettingsResult, facilityResult] =
			await Promise.all([
				sqlClient.storeSettings.findFirst({
					where: { storeId: actualStoreId },
				}),
				sqlClient.rsvpSettings.findFirst({
					where: { storeId: actualStoreId },
				}),
				facilityId
					? sqlClient.storeFacility.findUnique({
							where: { id: facilityId },
						})
					: Promise.resolve(null),
			]);

		storeSettings = storeSettingsResult;
		rsvpSettings = rsvpSettingsResult;
		facility = facilityResult;

		transformPrismaDataForJson(store);

		if (rsvpSettings) {
			transformPrismaDataForJson(rsvpSettings);
		}
		if (storeSettings) {
			transformPrismaDataForJson(storeSettings);
		}
		if (facility) {
			transformPrismaDataForJson(facility);
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
		redirect("/unv");
	}

	if (!storeSettings) {
		logger.warn("Store settings not found", {
			metadata: { storeId: params.storeId },
			tags: ["store", "settings", "warning"],
		});
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

		isStoreOpen = store?.isOpen && businessHours.isOpenNow();

		const nextOpeningDate = businessHours.nextOpeningDate();
		const nextOpeningHour = businessHours.nextOpeningHour();

		closed_descr = `${formatDate(nextOpeningDate, "yyyy-MM-dd")} ${nextOpeningHour}`;
	}

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
					facilityData={facility || undefined}
				/>
			)}
		</Container>
	);
}
