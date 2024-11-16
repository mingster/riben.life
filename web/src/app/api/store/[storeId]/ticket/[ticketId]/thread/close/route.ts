import { IsSignInResponse } from "@/lib/auth/utils";
import { sqlClient } from "@/lib/prismadb";
import { TicketStatus } from "@/types/enum";

import { NextResponse } from "next/server";

///!SECTION mark this ticket as close.
export async function DELETE(
  req: Request,
  props: { params: Promise<{ storeId: string; ticketId: string }> },
) {
  const params = await props.params;
  try {
    const userId = await IsSignInResponse();
    if (typeof userId !== "string") {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.storeId) {
      return new NextResponse("Store id is required", { status: 400 });
    }

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
    const obj = await sqlClient.supportTicket.updateMany({
      where: {
        threadId: orig_ticket.threadId,
      },
      data: {
        status: TicketStatus.Closed,
      },
    });
    console.log(`${obj.count} tickets closed`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("[TICKET_DELETE]", error);

    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
