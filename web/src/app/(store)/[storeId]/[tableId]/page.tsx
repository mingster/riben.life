import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import BusinessHours from "@/lib/businessHours";
import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/utils/utils";
import type { StoreSettings, StoreTables } from "@prisma/client";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import getStoreWithProducts from "@/actions/get-store-with-products";
import { formatDate } from "date-fns";
import { StoreHomeContent } from "../components/store-home-content";

type Params = Promise<{ storeId: string; tableId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function TableOrderPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	const store = await getStoreWithProducts(params.storeId);

	if (!store) {
		redirect("/unv");
	}

	transformDecimalsToNumbers(store);

	const table = (await sqlClient.storeTables.findFirst({
		where: {
			id: params.tableId,
		},
	})) as StoreTables;

	const storeSettings = (await sqlClient.storeSettings.findFirst({
		where: {
			storeId: params.storeId,
		},
	})) as StoreSettings;

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
						<StoreHomeContent
							storeData={store}
							storeSettings={storeSettings}
							tableData={table}
						/>
					</>
				)}
			</Container>
		</Suspense>
	);
}
