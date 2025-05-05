"use server";

import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { Suspense } from "react";
import { DisplayThread } from "./display-thread";
import { TicketReply } from "./ticket-reply";

type Params = Promise<{ orderId: string; ticketId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function TicketEditPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	const ticket = await sqlClient.supportTicket.findUnique({
		where: {
			id: params.ticketId,
		},
	});

	//console.log(`ProductPa//ge: ${JSON.stringify(product)}`);
	let _action = "Reply";
	if (ticket === null) _action = "New";

	// get thread for this ticket
	const thread = await sqlClient.supportTicket.findMany({
		where: {
			threadId: ticket?.threadId,
		},
		include: {
			Sender: true,
		},
		orderBy: {
			updatedAt: "desc",
		},
	});
	//console.log(`thread: ${JSON.stringify(thread)}`);

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<div className="flex-col">
					<div className="flex-1 space-y-4 p-8 pt-6">
						{
							// if there's thread, display them along with reply form
							ticket !== null ? (
								<>
									<DisplayThread thread={thread} />
									<TicketReply initialData={ticket} />
								</>
							) : (
								<>
									{/* otherwise display create form <TicketCreate initialData={null} />*/}
								</>
							)
						}
					</div>
				</div>
			</Container>
		</Suspense>
	);
}
