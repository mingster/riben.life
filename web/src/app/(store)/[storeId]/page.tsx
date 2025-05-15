import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import BusinessHours from "@/lib/businessHours";

import { transformDecimalsToNumbers } from "@/utils/utils";

import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StoreHomeContent } from "./components/store-home-content";

import getStoreWithProducts from "@/actions/get-store-with-products";
import logger from "@/utils/logger";
import { sqlClient } from "@/lib/prismadb";
import type { StoreSettings } from "@prisma/client";
import { formatDate } from "date-fns";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreHomePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const store = await getStoreWithProducts(params.storeId);

	const isProduction = process.env.NODE_ENV === "production";
	if (!isProduction) {
		// server logging
		logger.info(store);
	}

	if (!store) {
		redirect("/unv");
	}

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
		<Suspense fallback={<Loader />}>
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
		</Suspense>
	);
}
