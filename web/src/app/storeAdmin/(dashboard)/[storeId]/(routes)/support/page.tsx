import Container from "@/components/ui/container";
import { auth, Session } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { getStoreWithRelations } from "@/lib/store-access";
import { TicketStatus } from "@/types/enum";
import { formatDateTime } from "@/utils/datetime-utils";
import type { SupportTicket } from "@prisma/client";
import { headers } from "next/headers";
import type { TicketColumn } from "./components/columns";
import { TicketClient } from "./components/ticket-client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreSupportPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	const session = (await auth.api.getSession({
		headers: await headers(),
	})) as unknown as Session;
	const userId = session?.user.id;

	const tickets = await sqlClient.supportTicket.findMany({
		distinct: ["threadId"],
		where: {
			senderId: userId,
			storeId: params.storeId,
			status: { in: [TicketStatus.Open, TicketStatus.Active] },
		},
		orderBy: {
			lastModified: "desc",
		},
	});

	// Map tickets to UI columns
	const formattedTickets: TicketColumn[] = tickets.map(
		(item: SupportTicket) => ({
			id: item.id,
			department: item.department,
			subject: item.subject,
			status: item.status,
			updatedAt: formatDateTime(item.lastModified),
		}),
	);

	const store = await getStoreWithRelations(params.storeId);
	return (
		<Container>
			<TicketClient data={formattedTickets} store={store} />
		</Container>
	);
}
