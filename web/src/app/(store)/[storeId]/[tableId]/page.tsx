import Container from "@/components/ui/container";
import BusinessHours from "@/lib/businessHours";
import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/utils/utils";
import type { StoreSettings, StoreTables } from "@prisma/client";
import { redirect } from "next/navigation";
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

	// Parallel queries for optimal performance - 3x faster!
	const [store, table, storeSettings] = await Promise.all([
		getStoreWithProducts(params.storeId),
		sqlClient.storeTables.findFirst({
			where: { id: params.tableId },
		}),
		sqlClient.storeSettings.findFirst({
			where: { storeId: params.storeId },
		}),
	]);

	if (!store) {
		redirect("/unv");
	}

	transformDecimalsToNumbers(store);

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
				<StoreHomeContent
					storeData={store}
					storeSettings={storeSettings as StoreSettings}
					tableData={table as StoreTables}
				/>
			)}
		</Container>
	);
}
