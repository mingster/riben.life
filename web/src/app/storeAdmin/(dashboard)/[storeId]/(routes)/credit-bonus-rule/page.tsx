import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import type { CreditBonusRule } from "@prisma/client";
import { CreditBonusRuleClient } from "./components/client-credit-bonus-rule";
import {
	mapCreditBonusRuleToColumn,
	type CreditBonusRuleColumn,
} from "./credit-bonus-rule-column";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function CreditBonusRulePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	const rules = await sqlClient.creditBonusRule.findMany({
		where: { storeId: params.storeId },
		orderBy: { threshold: "asc" },
	});

	// Map rules to UI columns
	const formattedData: CreditBonusRuleColumn[] = (
		rules as CreditBonusRule[]
	).map(mapCreditBonusRuleToColumn);

	return (
		<Container>
			<CreditBonusRuleClient serverData={formattedData} />
		</Container>
	);
}
