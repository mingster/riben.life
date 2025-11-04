import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { TicketStatus } from "@/types/enum";
import { getUtcNow } from "@/utils/datetime-utils";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import logger from "@/lib/logger";

///!SECTION add reply to this ticket from store staff.
export async function PATCH(
	req: Request,
	props: { params: Promise<{ storeId: string; ticketId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);
		const session = await auth.api.getSession({
			headers: await headers(), // you need to pass the headers object.
		});
		const userId = session?.user.id;
		if (typeof userId !== "string") {
			return new NextResponse("Unauthenticated", { status: 400 });
		}

		if (!params.ticketId) {
			return new NextResponse("ticketId is required", { status: 401 });
		}

		const store = await sqlClient.store.findUnique({
			where: {
				id: params.storeId,
			},
		});
		if (!store) {
			return new NextResponse("Store not found", { status: 501 });
		}

		const orig_ticket = await sqlClient.supportTicket.findUnique({
			where: {
				id: params.ticketId,
			},
		});

		if (!orig_ticket) {
			return new NextResponse("ticket not found", { status: 502 });
		}

		const body = await req.json();
		const { message } = body;

		// create reply record
		const reply = await sqlClient.supportTicket.create({
			data: {
				storeId: params.storeId,
				threadId: orig_ticket.threadId,
				senderId: userId,
				recipientId: store.ownerId,
				priority: 1,
				creator: userId,
				modifier: userId,
				status: TicketStatus.Replied,
				department: orig_ticket.department,
				subject: orig_ticket.subject,
				message,
				lastModified: getUtcNow(),
			},
		});

		//console.log(`replied ticket: ${JSON.stringify(reply)}`);

		// update status in this thread
		const _cnt = await sqlClient.supportTicket.updateMany({
			where: {
				threadId: reply.threadId,
			},
			data: {
				status: TicketStatus.Replied,
				lastModified: getUtcNow(),
			},
		});

		return NextResponse.json(reply);
	} catch (error) {
		logger.info("ticket patch", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}

///!SECTION mark this ticket as archived.
export async function DELETE(
	_req: Request,
	props: { params: Promise<{ storeId: string; ticketId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		if (!params.ticketId) {
			return new NextResponse("ticketId is required", { status: 401 });
		}

		const orig_ticket = await sqlClient.supportTicket.findUnique({
			where: {
				id: params.ticketId,
			},
		});

		if (!orig_ticket) {
			return new NextResponse("ticket not found", { status: 502 });
		}
		/*
	const body = await req.json();
	const obj = await sqlClient.supportTicket.delete({
	  where: {
		id: params.ticketId,
	  },
	});
	const obj = await sqlClient.supportTicket.update({
	  where: {
		id: params.ticketId,
	  },
	  data: {
		status: TicketStatus.Archived,
	  },
	});
	*/

		// update status in this thread
		sqlClient.supportTicket.updateMany({
			where: {
				threadId: orig_ticket.threadId,
			},
			data: {
				status: TicketStatus.Archived,
				lastModified: getUtcNow(),
			},
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		logger.info("ticket delete", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
