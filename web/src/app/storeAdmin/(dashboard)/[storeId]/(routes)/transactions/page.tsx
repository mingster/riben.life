import Container from "@/components/ui/container";

import { checkStoreAccess } from "@/lib/store-admin-utils";

import { sqlClient } from "@/lib/prismadb";
import type { Store, StoreOrder } from "@/types";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { format } from "date-fns";
import type { StoreOrderColumn } from "./components/columns";
import { TransactionClient } from "./components/transaction-client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function TransactionMgmtPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	const store = (await checkStoreAccess(params.storeId)) as Store;

	const orders = (await sqlClient.storeOrder.findMany({
		where: {
			storeId: store.id,
		},
		include: {
			//Store: true,
			OrderNotes: true,
			OrderItemView: true,
			User: true,
			ShippingMethod: true,
			PaymentMethod: true,
		},
		orderBy: {
			updatedAt: "desc",
		},
	})) as StoreOrder[];

	transformDecimalsToNumbers(orders);

	// map order to ui
	const formattedData: StoreOrderColumn[] = orders.map((item: StoreOrder) => ({
		id: item.id,
		storeId: item.storeId,
		user: item.User?.username || "",
		orderStatus: item.orderStatus || 0,
		amount: Number(item.orderTotal),
		refundAmount: Number(item.refundAmount) || 0,
		currency: item.currency,
		isPaid: item.isPaid,
		updatedAt: format(item.updatedAt, "yyyy-MM-dd HH:mm:ss"),
		paymentMethod: item.PaymentMethod?.name,
		shippingMethod: item.ShippingMethod.name,
		orderItems: item.OrderItemView,
		//tableId: item.tableId,
		orderNum: Number(item.orderNum),
		paymentCost: Number(item.paymentCost) || 0,
		note: item.OrderNotes[0]?.note || "",
	}));

	return (
		<Container>
			<TransactionClient store={store} data={formattedData} />
		</Container>
	);
}
