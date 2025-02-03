import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import BusinessHours from "@/lib/businessHours";
import { mongoClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import type { StoreSettings } from "@prisma-mongo/prisma/client";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StoreHomeContent } from "./components/store-home-content";

import getStoreWithProducts from "@/actions/get-store-with-products";
import { formatDate } from "date-fns";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreHomePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const store = await getStoreWithProducts(params.storeId);

	//console.log(JSON.stringify(store));

	if (!store) {
		redirect("/unv");
	}

	transformDecimalsToNumbers(store);

	const storeSettings = (await mongoClient.storeSettings.findFirst({
		where: {
			databaseId: params.storeId,
		},
	})) as StoreSettings;
	//console.log(JSON.stringify(storeSettings));

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
						<StoreHomeContent storeData={store} mongoData={storeSettings} />
					</>
				)}
			</Container>
		</Suspense>
	);
}
