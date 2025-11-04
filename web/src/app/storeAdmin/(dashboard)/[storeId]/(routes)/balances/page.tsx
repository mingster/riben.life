import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { getStoreWithRelations } from "@/lib/store-access";
import { transformDecimalsToNumbers } from "@/utils/utils";
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

	// Note: checkStoreStaffAccess already called in layout (cached)
	const legers = (await sqlClient.storeLedger.findMany({
		where: {
			storeId: params.storeId,
			type: 0,
		},
		orderBy: {
			createdAt: "desc",
		},
	})) as StoreLedger[];
	transformDecimalsToNumbers(legers);

	const store = await getStoreWithRelations(params.storeId);
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
