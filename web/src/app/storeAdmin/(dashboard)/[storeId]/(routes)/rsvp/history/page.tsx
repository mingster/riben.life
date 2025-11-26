import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import type { Rsvp } from "@prisma/client";
import { mapRsvpToColumn, RsvpColumn } from "./rsvp-column";
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
		orderBy: { rsvpTime: "desc" },
	});

	// Map rsvps to UI columns
	const formattedData: RsvpColumn[] = (rsvps as Rsvp[]).map(mapRsvpToColumn);

	return (
		<Container>
			<RsvpHistoryClient serverData={formattedData} />
		</Container>
	);
}
