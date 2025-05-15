import Container from "@/components/ui/container";
import { checkStoreAccess } from "@/lib/store-admin-utils";

import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/utils/utils";
import type { Store } from "@/types";
import type { StoreLedger } from "@prisma/client";
import { format } from "date-fns";
import { BalancesClient } from "./components/balances-client";
import type { StoreLedgerColumn } from "./components/columns";

type Params = Promise<{ storeId: string; messageId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function BalanceMgmtPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const store = (await checkStoreAccess(params.storeId)) as Store;
	// this store is pro version or not?
	//const disablePaidOptions = await !isProLevel(store?.id);

	const legers = (await sqlClient.storeLedger.findMany({
		where: {
			storeId: store.id,
			type: 0,
		},
		orderBy: {
			createdAt: "desc",
		},
	})) as StoreLedger[];
	transformDecimalsToNumbers(legers);

	//console.log(JSON.stringify(legers));

	// map order to ui
	const formattedData: StoreLedgerColumn[] = legers.map(
		(item: StoreLedger) => ({
			id: item.id,
			storeId: item.storeId,
			orderId: item.orderId,
			amount: Number(item.amount),
			fee: Number(item.fee),
			platformFee: Number(item.platformFee),
			currency: item.currency,
			balance: Math.round(Number(item.balance)),
			description: item.description,
			note: item.note,
			createdAt: format(item.createdAt, "yyyy-MM-dd HH:mm:ss"),
			availablity: format(item.availablity, "yyyy-MM-dd HH:mm:ss"),
		}),
	);

	return (
		<Container>
			<BalancesClient store={store} data={formattedData} />
		</Container>
	);
}
