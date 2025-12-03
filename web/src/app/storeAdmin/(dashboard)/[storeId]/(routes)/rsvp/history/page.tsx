import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { Rsvp } from "@/types";
import { RsvpHistoryClient } from "../components/client-rsvp";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function RsvpPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	const rsvps = await sqlClient.rsvp.findMany({
		where: { storeId: params.storeId },
		include: {
			Store: true,
			User: true,
			Order: true,
			Facility: true,
			FacilityPricingRule: true,
		},
		orderBy: { rsvpTime: "desc" },
	});

	// Transform Decimal objects to numbers for client components
	const formattedData: Rsvp[] = (rsvps as Rsvp[]).map((rsvp) => {
		const transformed = { ...rsvp };
		transformPrismaDataForJson(transformed);
		return transformed as Rsvp;
	});

	return (
		<Container>
			<RsvpHistoryClient serverData={formattedData} />
		</Container>
	);
}
