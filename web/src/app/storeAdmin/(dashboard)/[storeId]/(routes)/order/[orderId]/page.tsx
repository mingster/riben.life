//create or edit store order

import { checkStoreStaffAccess } from "@/lib/store-admin-utils";

import getOrderById from "@/actions/get-order-by_id";
import type { StoreOrder } from "@/types";
import { PageAction } from "@/types/enum";
import { OrderEditClient } from "./client";

type Params = Promise<{ storeId: string; orderId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function OrderEditPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// checkStoreAccess already returns the store, no need to call getStoreWithProducts
	const store = await checkStoreStaffAccess(params.storeId);

	const order = (await getOrderById(params.orderId)) as StoreOrder | null;
	/*
  let order = (await sqlClient.storeOrder.findUnique({
    where: {
      id: params.orderId,
    },
    include: {
      OrderNotes: true,
      OrderItemView: {
        include: {
          Product: true,
        },
      },
      User: true,
      ShippingMethod: true,
      PaymentMethod: true,
    },
  })) as StoreOrder | null;
  */

	//console.log('order', JSON.stringify(order));

	let action = PageAction.Modify;
	if (order === null) {
		action = PageAction.Create;
	}

	return (
		<div className="flex-col">
			<div className="flex-1 space-y-4 p-8 pt-6">
				<OrderEditClient store={store} order={order} action={action} />
			</div>
		</div>
	);
}
