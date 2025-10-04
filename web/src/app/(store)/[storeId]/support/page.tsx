import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { TicketStatus } from "@/types/enum";
import type { StoreSettings, SupportTicket } from "@prisma/client";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { TicketColumn } from "./components/columns";
import { TicketClient } from "./components/ticket-client";

import { auth } from "@/lib/auth";
import { formatDateTime } from "@/utils/datetime-utils";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreSupportPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const session = await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	}); const userId = session?.user.id;

	if (!session) {
		redirect(`${process.env.NEXT_PUBLIC_API_URL}/auth/signin`);
	}

	const store = await sqlClient.store.findFirst({
		where: {
			id: params.storeId,
		},
	});

	if (!store) {
		redirect("/unv");
	}

	const tickets = await sqlClient.supportTicket.findMany({
		distinct: ["threadId"],
		where: {
			senderId: userId,
			storeId: store.id,
			status: {
				in: [TicketStatus.Open, TicketStatus.Active, TicketStatus.Replied],
			},
		},
		include: {},
		orderBy: {
			updatedAt: "desc",
		},
	});

	// map tickets to ui
	const formattedTickets: TicketColumn[] = tickets.map(
		(item: SupportTicket) => ({
			id: item.id,
			department: item.department,
			subject: item.subject,
			status: item.status,
			updatedAt: formatDateTime(item.updatedAt),
		}),
	);

	const storeSettings = (await sqlClient.storeSettings.findFirst({
		where: {
			storeId: params.storeId,
		},
	})) as StoreSettings;

	if (!storeSettings) {
		// Handle the case where storeSettings is null
		// For example, you can return a default value or an error message
		return <div>Store settings not found</div>;
	}

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<TicketClient
					data={formattedTickets}
					store={store}
					storeSettings={storeSettings ?? {}}
				/>
			</Container>
		</Suspense>
	);
}
