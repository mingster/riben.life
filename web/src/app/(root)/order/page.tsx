import getStoreById from "@/actions/get-store-by_id";
import { GlobalNavbar } from "@/components/global-navbar";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import type { Store } from "@/types";
import { Suspense } from "react";
import { DisplayStoreOrdersToday } from "./display-order-today";

// 點餐記錄 - show order history from local storage.
//NOTE - why local storage?  because we allow anonymous user to place order.
//
type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreOrderStatusPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const _params = await props.params;

	const searchParams = await props.searchParams;
	const storeId = searchParams.storeId as string;

	const store = (await getStoreById(storeId)) as Store;

	return (
		<Suspense fallback={<Loader />}>
			<div className="bg-no-repeat bg-[url('/img/beams/hero@75.jpg')] dark:bg-[url('/img/beams/hero-dark@90.jpg')]">
				<GlobalNavbar title="" />
				<Container>
					<DisplayStoreOrdersToday store={store} />
				</Container>
			</div>
		</Suspense>
	);
}
