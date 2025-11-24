import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import type { FacilityPricingRule } from "@prisma/client";
import { FacilityPricingRuleClient } from "./components/client-facility-pricing-rule";
import {
	mapFacilityPricingRuleToColumn,
	type FacilityPricingRuleColumn,
} from "./facility-pricing-rule-column";
import { transformDecimalsToNumbers } from "@/utils/utils";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function FacilityPricingPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	const rules = await sqlClient.facilityPricingRule.findMany({
		where: { storeId: params.storeId },
		include: {
			Facility: {
				select: {
					facilityName: true,
				},
			},
		},
		orderBy: [{ priority: "desc" }, { name: "asc" }],
	});
	//transformDecimalsToNumbers(rules);

	// Map rules to UI columns
	const formattedData: FacilityPricingRuleColumn[] = (
		rules as (FacilityPricingRule & {
			Facility: { facilityName: string } | null;
		})[]
	).map(mapFacilityPricingRuleToColumn);

	console.log(formattedData);

	return (
		<Container>
			<FacilityPricingRuleClient serverData={formattedData} />
		</Container>
	);
}
