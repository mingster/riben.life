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
	const [rsvps, store, rsvpSettings] = await Promise.all([
		sqlClient.rsvp.findMany({
			where: { storeId: params.storeId },
			include: {
				Store: true,
				Customer: true,
				Order: true,
				Facility: true,
				FacilityPricingRule: true,
			},
			orderBy: { rsvpTime: "desc" },
		}),
		sqlClient.store.findUnique({
			where: { id: params.storeId },
			select: { defaultTimezone: true },
		}),
		sqlClient.rsvpSettings.findFirst({
			where: { storeId: params.storeId },
		}),
	]);

	// Transform Decimal objects to numbers for client components
	const formattedData: Rsvp[] = (rsvps as Rsvp[]).map((rsvp) => {
		const transformed = { ...rsvp };
		transformPrismaDataForJson(transformed);
		return transformed as Rsvp;
	});

	if (rsvpSettings) {
		transformPrismaDataForJson(rsvpSettings);
	}

	return (
		<Container>
			<RsvpHistoryClient
				serverData={formattedData}
				storeTimezone={store?.defaultTimezone || "Asia/Taipei"}
				rsvpSettings={rsvpSettings}
			/>
		</Container>
	);
}
