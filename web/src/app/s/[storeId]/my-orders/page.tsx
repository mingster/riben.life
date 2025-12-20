import getStoreById from "@/actions/get-store-by_id";
import { DisplayStoreOrdersToday } from "@/app/(root)/order/display-order-today";
import { GlobalNavbar } from "@/components/global-navbar";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import type { Store } from "@/types";
import { Suspense } from "react";

// 點餐記錄 - show order history from local storage.
//NOTE - why local storage?  because we allow anonymous user to place order.
//
type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function MyOrdersPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const storeId = params.storeId;

	const store = (await getStoreById(storeId)) as Store;

	return (
		<Container>
			<DisplayStoreOrdersToday store={store} />
		</Container>
	);
}
