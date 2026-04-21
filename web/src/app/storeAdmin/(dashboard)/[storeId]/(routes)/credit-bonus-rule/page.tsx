import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { CreditBonusRuleClient } from "./components/client-credit-bonus-rule";
import {
	type CreditBonusRuleColumn,
	mapCreditBonusRuleToColumn,
} from "./credit-bonus-rule-column";

type Params = Promise<{ storeId: string }>;

export default async function CreditBonusRulePage(props: { params: Params }) {
	const params = await props.params;
	const storeId = params.storeId;

	const rows = await sqlClient.creditBonusRule.findMany({
		where: { storeId },
		orderBy: { threshold: "asc" },
	});

	transformPrismaDataForJson(rows);

	const serverData: CreditBonusRuleColumn[] = rows.map((row) =>
		mapCreditBonusRuleToColumn(row),
	);

	return (
		<Container>
			<CreditBonusRuleClient serverData={serverData} />
		</Container>
	);
}
