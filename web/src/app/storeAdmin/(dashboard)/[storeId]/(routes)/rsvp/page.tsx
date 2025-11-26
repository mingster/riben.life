import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import type { Rsvp } from "@prisma/client";
import { RsvpCalendarClient } from "./components/client-rsvp-calendar";
import { mapRsvpToColumn, type RsvpColumn } from "./history/rsvp-column";
import { startOfWeek, endOfWeek } from "date-fns";

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

	const rsvps = await sqlClient.rsvp.findMany({
		where: {
			storeId: params.storeId,
			rsvpTime: {
				gte: rangeStart,
				lte: rangeEnd,
			},
		},
		orderBy: { rsvpTime: "asc" },
	});

	// Map rsvps to UI columns
	const formattedData: RsvpColumn[] = (rsvps as Rsvp[]).map(mapRsvpToColumn);

	return (
		<Container>
			<RsvpCalendarClient serverData={formattedData} />
		</Container>
	);
}
