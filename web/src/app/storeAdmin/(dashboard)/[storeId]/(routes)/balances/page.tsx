import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { BalanceClient } from "./components/client-balance";
import { mapStoreLedgerToColumn, type BalanceColumn } from "./balance-column";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function BalanceMgmtPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	const ledgers = await sqlClient.storeLedger.findMany({
		where: {
			storeId: params.storeId,
			type: 0,
		},
		orderBy: {
			createdAt: "desc",
		},
	});

	transformDecimalsToNumbers(ledgers);

	const formattedData: BalanceColumn[] = ledgers.map((ledger) =>
		mapStoreLedgerToColumn(ledger, params.storeId),
	);

	return (
		<Container>
			<BalanceClient serverData={formattedData} />
		</Container>
	);
}
