import Container from "@/components/ui/container";
import BusinessHours from "@/lib/businessHours";

import { transformDecimalsToNumbers } from "@/utils/utils";

import { redirect } from "next/navigation";
import { StoreHomeContent } from "./components/store-home-content";

import getStoreWithProducts from "@/actions/get-store-with-products";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { isReservedRoute } from "@/lib/reserved-routes";
import type { StoreSettings } from "@prisma/client";
import { formatDate } from "date-fns";

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

	let store;
	try {
		store = await getStoreWithProducts(params.storeId);
	} catch (error) {
		logger.error(`Failed to load store: ${params.storeId}`);
		// Redirect to homepage or a "store not found" page
		redirect("/unv");
	}

	const isProduction = process.env.NODE_ENV === "production";
	if (!isProduction) {
		// server logging
		//logger.info(store);
	}

	// Store is guaranteed to exist here due to try-catch above
	transformDecimalsToNumbers(store);

	const storeSettings = (await sqlClient.storeSettings.findFirst({
		where: {
			storeId: params.storeId,
		},
	})) as StoreSettings;

	/*
const { t } = await useTranslation(store?.defaultLocale || "en");
<h1>{t("store_closed")}</h1>
<div>
{t("store_next_opening_hours")}
{closed_descr}
</div>
  */

	let closed_descr = "";
	let isStoreOpen = store.isOpen;
	if (store.useBusinessHours && storeSettings.businessHours !== null) {
		const bizHour = storeSettings.businessHours;
		const businessHours = new BusinessHours(bizHour);

		isStoreOpen = businessHours.isOpenNow();

		const nextOpeningDate = businessHours.nextOpeningDate();
		const nextOpeningHour = businessHours.nextOpeningHour();

		closed_descr = `${formatDate(nextOpeningDate, "yyyy-MM-dd")} ${nextOpeningHour}`;
	}

	//console.log(`closed_descr: ${closed_descr}`);
	//console.log(`isStoreOpen: ${isStoreOpen}`);

	return (
		<Container>
			{!isStoreOpen ? (
				<>
					<h1>目前店休，無法接受訂單</h1>
					<div>
						下次開店時間:
						{closed_descr}
					</div>
				</>
			) : (
				<>
					<StoreHomeContent storeData={store} storeSettings={storeSettings} />
				</>
			)}
		</Container>
	);
}
