//create or edit store order

import getOrderById from "@/actions/get-order-by_id";
import getStoreWithCategories from "@/actions/get-store";
import type { StoreOrder, StoreWithProducts } from "@/types";
import { PageAction } from "@/types/enum";
import { OrderEditClient } from "./client";
import { redirect } from "next/navigation";

type Params = Promise<{ storeId: string; orderId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function OrderEditPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	const [storeResult, order] = await Promise.all([
		getStoreWithCategories(params.storeId),
		getOrderById(params.orderId),
	]);

	if (!storeResult) {
		redirect("/storeAdmin");
	}

	const store = storeResult;

	//console.log('order', JSON.stringify(order));

	let action = PageAction.Modify;
	if (order === null) {
		action = PageAction.Create;
	}

	return (
		<div className="flex-col">
			<div className="flex-1 space-y-4 p-8 pt-6">
				<OrderEditClient
					store={store as unknown as StoreWithProducts}
					order={order as StoreOrder | null}
					action={action}
				/>
			</div>
		</div>
	);
}
