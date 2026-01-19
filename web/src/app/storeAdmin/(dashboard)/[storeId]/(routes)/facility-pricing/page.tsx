import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { FacilityPricingRule } from "@prisma/client";
import { FacilityPricingRuleClient } from "./components/client-facility-pricing-rule";
import {
	mapFacilityPricingRuleToColumn,
	type FacilityPricingRuleColumn,
} from "./facility-pricing-rule-column";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// enable facility to have different pricing depending on the time of day and day of week
// 
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
	transformPrismaDataForJson(rules);

	// Map rules to UI columns
	const formattedData: FacilityPricingRuleColumn[] = (
		rules as (FacilityPricingRule & {
			Facility: { facilityName: string } | null;
		})[]
	).map(mapFacilityPricingRuleToColumn);

	//console.log(formattedData);

	return (
		<Container>
			<FacilityPricingRuleClient serverData={formattedData} />
		</Container>
	);
}
