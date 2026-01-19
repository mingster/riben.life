import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { FacilityServiceStaffPricingRule } from "@prisma/client";
import { FacilityServiceStaffPricingRuleClient } from "./components/client-facility-service-staff-pricing-rule";
import {
	mapFacilityServiceStaffPricingRuleToColumn,
	type FacilityServiceStaffPricingRuleColumn,
} from "./facility-service-staff-pricing-rule-column";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function FacilityServiceStaffPricingPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	const rules = await sqlClient.facilityServiceStaffPricingRule.findMany({
		where: { storeId: params.storeId },
		include: {
			Facility: {
				select: {
					facilityName: true,
				},
			},
			ServiceStaff: {
				select: {
					User: {
						select: {
							name: true,
						},
					},
				},
			},
		},
		orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
	});
	transformPrismaDataForJson(rules);

	// Map rules to UI columns
	const formattedData: FacilityServiceStaffPricingRuleColumn[] = (
		rules as (FacilityServiceStaffPricingRule & {
			Facility: { facilityName: string } | null;
			ServiceStaff: { User: { name: string | null } } | null;
		})[]
	).map(mapFacilityServiceStaffPricingRuleToColumn);

	return (
		<Container>
			<FacilityServiceStaffPricingRuleClient serverData={formattedData} />
		</Container>
	);
}
