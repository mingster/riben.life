import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import { sqlClient } from "@/lib/prismadb";
import { TicketStatus } from "@/types/enum";
import { formatDateTime } from "@/utils/datetime-utils";
import type { Store, SupportTicket } from "@prisma/client";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { TicketColumn } from "./components/columns";
import { TicketClient } from "./components/ticket-client";
import { auth, Session } from "@/lib/auth";
import { headers } from "next/headers";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreSupportPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	const store = (await checkStoreStaffAccess(params.storeId)) as Store;

	if (!store) {
		redirect("/unv");
	}

	const session = (await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	})) as unknown as Session;
	const userId = session?.user.id;

	const tickets = await sqlClient.supportTicket.findMany({
		distinct: ["threadId"],
		where: {
			senderId: userId,
			storeId: store.id,
			status: { in: [TicketStatus.Open, TicketStatus.Active] },
		},
		include: {},
		orderBy: {
			lastModified: "desc",
		},
	});

	// map tickets to ui
	const formattedTickets: TicketColumn[] = tickets.map(
		(item: SupportTicket) => ({
			id: item.id,
			department: item.department,
			subject: item.subject,
			status: item.status,
			updatedAt: formatDateTime(item.lastModified),
		}),
	);

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<TicketClient data={formattedTickets} store={store} />
			</Container>
		</Suspense>
	);
}
