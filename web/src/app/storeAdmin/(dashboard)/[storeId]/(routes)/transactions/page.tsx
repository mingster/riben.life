import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { TransactionClient } from "./components/client-transaction";
import {
	mapStoreOrderToColumn,
	type TransactionColumn,
} from "./transaction-column";
import type { StoreOrder } from "@/types";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function TransactionMgmtPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	const orders = await sqlClient.storeOrder.findMany({
		where: {
			storeId: params.storeId,
		},
		include: {
			OrderNotes: true,
			OrderItemView: true,
			User: true,
			ShippingMethod: true,
			PaymentMethod: true,
		},
		orderBy: {
			updatedAt: "desc",
		},
	});

	transformPrismaDataForJson(orders);

	const formattedData: TransactionColumn[] = orders.map((item) =>
		mapStoreOrderToColumn(item as StoreOrder),
	);

	return (
		<Container>
			<TransactionClient serverData={formattedData} />
		</Container>
	);
}
