import { IsSignInResponse } from "@/lib/auth/utils";
import { sqlClient } from "@/lib/prismadb";
import { TicketStatus } from "@/types/enum";
import { getUtcNow } from "@/utils/utils";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";

///!SECTION add reply to this ticket from store staff.
export async function PATCH(
	req: Request,
	props: { params: Promise<{ storeId: string; ticketId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);
		const userId = IsSignInResponse();
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
				recipentId: store.ownerId,
				status: TicketStatus.Replied,
				department: orig_ticket.department,
				subject: orig_ticket.subject,
				message,
				updatedAt: getUtcNow(),
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
				updatedAt: getUtcNow(),
			},
		});

		return NextResponse.json(reply);
	} catch (error) {
		console.log("[TICKET_PATCH]", error);

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
				updatedAt: getUtcNow(),
			},
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.log("[TICKET_DELETE]", error);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
