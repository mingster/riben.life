import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { BalanceClient } from "./components/client-balance";
import { mapStoreLedgerToColumn, type BalanceColumn } from "./balance-column";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function BalanceMgmtPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	const [ledgers, store] = await Promise.all([
		sqlClient.storeLedger.findMany({
			where: {
				storeId: params.storeId,
			},
			orderBy: {
				createdAt: "desc",
			},
		}),
		sqlClient.store.findUnique({
			where: { id: params.storeId },
			select: { defaultTimezone: true },
		}),
	]);

	transformPrismaDataForJson(ledgers);

	const formattedData: BalanceColumn[] = ledgers.map((ledger) =>
		mapStoreLedgerToColumn(ledger, params.storeId),
	);

	return (
		<Container>
			<BalanceClient
				serverData={formattedData}
				storeTimezone={store?.defaultTimezone || "Asia/Taipei"}
			/>
		</Container>
	);
}
