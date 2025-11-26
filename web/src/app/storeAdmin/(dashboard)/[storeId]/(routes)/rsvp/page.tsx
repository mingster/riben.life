import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { RsvpCalendarClient } from "./components/client-rsvp-calendar";
import { startOfWeek, endOfWeek } from "date-fns";
import { transformDecimalsToNumbers } from "@/utils/utils";
import type { Rsvp } from "@/types";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function RsvpPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	// Get RSVPs for a wider range (current week ± 2 weeks) to support navigation
	const now = new Date();
	const weekStart = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
	const weekEnd = endOfWeek(now, { weekStartsOn: 0 }); // Saturday

	// Extend range by 2 weeks before and after
	const rangeStart = new Date(weekStart);
	rangeStart.setDate(rangeStart.getDate() - 14);
	const rangeEnd = new Date(weekEnd);
	rangeEnd.setDate(rangeEnd.getDate() + 14);

	const [rsvps, rsvpSettings, storeSettings] = await Promise.all([
		sqlClient.rsvp.findMany({
			where: {
				storeId: params.storeId,
				rsvpTime: {
					gte: rangeStart,
					lte: rangeEnd,
				},
			},
			include: {
				Store: true,
				User: true,
				Order: true,
				Facility: true,
				FacilityPricingRule: true,
			},
			orderBy: { rsvpTime: "asc" },
		}),
		sqlClient.rsvpSettings.findFirst({
			where: { storeId: params.storeId },
		}),
		sqlClient.storeSettings.findFirst({
			where: { storeId: params.storeId },
		}),
	]);

	// Transform Decimal objects to numbers for client components
	const formattedData: Rsvp[] = (rsvps as Rsvp[]).map((rsvp) => {
		const transformed = { ...rsvp };
		transformDecimalsToNumbers(transformed);
		return transformed as Rsvp;
	});

	if (rsvpSettings) {
		transformDecimalsToNumbers(rsvpSettings);
	}
	if (storeSettings) {
		transformDecimalsToNumbers(storeSettings);
	}

	return (
		<Container>
			<RsvpCalendarClient
				serverData={formattedData}
				rsvpSettings={rsvpSettings}
				storeSettings={storeSettings}
			/>
		</Container>
	);
}
