//create or edit store order

import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";

import getOrderById from "@/actions/get-order-by_id";
import type { Store, StoreOrder } from "@/types";
import { OrderRefundClient } from "./refund-client";

type Params = Promise<{ storeId: string; orderId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// store admin can refund full or partial order
export default async function OrderRefundPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	//const store = (await checkStoreAccess(params.storeId)) as Store;

	const order = (await getOrderById(params.orderId)) as StoreOrder;
	if (order === null) {
		return <div>Order not found</div>;
	}

	//console.log('order', JSON.stringify(order));

	return (
		<div className="flex-col">
			<div className="flex-1 space-y-4 p-8 pt-6">
				<OrderRefundClient order={order} />
			</div>
		</div>
	);
}
