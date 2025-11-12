"use server";

import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { DisplayThread } from "./display-thread";
import { TicketReply } from "./ticket-reply";

type Params = Promise<{ orderId: string; ticketId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function TicketEditPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Parallel queries for optimal performance
	const [ticket, thread] = await Promise.all([
		sqlClient.supportTicket.findUnique({
			where: { id: params.ticketId },
		}),
		sqlClient.supportTicket.findMany({
			where: { threadId: params.ticketId },
			include: {
				Sender: true,
			},
			orderBy: {
				lastModified: "desc",
			},
		}),
	]);

	return (
		<Container>
			<div className="flex-col">
				<div className="flex-1 space-y-4 p-8 pt-6">
					{ticket !== null ? (
						<>
							<DisplayThread thread={thread} />
							<TicketReply initialData={ticket} />
						</>
					) : (
						<div>Ticket not found</div>
					)}
				</div>
			</div>
		</Container>
	);
}
