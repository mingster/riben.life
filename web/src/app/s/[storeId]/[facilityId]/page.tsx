import Container from "@/components/ui/container";
import BusinessHours from "@/lib/businessHours";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { StoreSettings, StoreFacility } from "@prisma/client";
import { redirect } from "next/navigation";
import getStoreWithProducts from "@/actions/get-store-with-products";
import { formatDate } from "date-fns";
import { StoreProductList } from "../components/store-product-list";
import { getT } from "@/app/i18n";

type Params = Promise<{ storeId: string; facilityId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// customer scan table QR code, which redirect to this page.
//
export default async function TableOrderPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Fetch store first (supports both ID and name)
	const store = await getStoreWithProducts(params.storeId);

	if (!store) {
		redirect("/unv");
	}

	// Use the actual store ID for subsequent queries (in case we found by name)
	const actualStoreId = store.id;

	// Fetch facility and settings in parallel
	const [facility, storeSettings] = await Promise.all([
		sqlClient.storeFacility.findFirst({
			where: { id: params.facilityId },
		}),
		sqlClient.storeSettings.findFirst({
			where: { storeId: actualStoreId },
		}),
	]);

	transformPrismaDataForJson(store);
	if (storeSettings) {
		transformPrismaDataForJson(storeSettings);
	}

	if (facility) {
		transformPrismaDataForJson(facility);
	}

	let closed_descr = "";
	let isStoreOpen = store.isOpen;
	if (store.useBusinessHours && storeSettings?.businessHours !== null) {
		const bizHour = storeSettings?.businessHours;
		if (bizHour) {
			const businessHours = new BusinessHours(bizHour);
			isStoreOpen = businessHours.isOpenNow();
			const nextOpeningDate = businessHours.nextOpeningDate();
			const nextOpeningHour = businessHours.nextOpeningHour();
			closed_descr = `${formatDate(nextOpeningDate, "yyyy-MM-dd")} ${nextOpeningHour}`;
		}
	}
	const { t } = await getT("tw", "translation");

	return (
		<Container>
			{!isStoreOpen ? (
				<>
					<h1>{t("store_closed")}</h1>
					<div>
						{t("store_next_opening_hours")}:{closed_descr}
					</div>
				</>
			) : (
				<StoreProductList
					storeData={store}
					storeSettings={storeSettings as StoreSettings}
					tableData={facility as StoreFacility}
				/>
			)}
		</Container>
	);
}
