//import { sendMail } from "@/actions/send-store-notification";

import { NextResponse } from "next/server";
import { phasePlaintextToHtm } from "@/actions/mail/phase-plaintext-to-htm";
import { getT } from "@/app/i18n";
import { sqlClient } from "@/lib/prismadb";
import type { SupportTicket } from "@/types";
import type { StringNVType } from "@/types/enum";
import { TicketStatus } from "@/types/enum";
import logger from "@/lib/logger";
import { getServerUrl } from "@/actions/server-util";
import { getUtcNow } from "@/utils/datetime-utils";

// send message to store owner when someone creates a new ticket
//
export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;

	try {
		const body = await req.json();

		const { t } = await getT();

		// expect body to be a SupportTicket
		const ticket = body as SupportTicket;

		if (!ticket) {
			return new NextResponse("ticket is required", { status: 400 });
		}

		// get the support email from the store

		const store = await sqlClient.store.findFirst({
			where: { id: ticket.storeId },
			include: {
				Owner: true,
			},
		});

		if (!store) {
			return new NextResponse("store is required", { status: 401 });
		}
		const supportEmail = store.Owner.email;
		if (!supportEmail) {
			return new NextResponse("support email is required", { status: 402 });
		}

		// get the server url
		const serverUrl = await getServerUrl();
		//const ticketUrl = `${serverUrl}/storeAdmin/${params.storeId}/support-tickets/?ticketId=${ticket.id}`;
		const ticketUrl = `${serverUrl}/storeAdmin/${ticket.storeId}/support/?ticketId=${ticket.threadId || ticket.id}`;

		const textMessage = `	
Ticket ID: ${ticket.threadId || ticket.id}
Subject: ${ticket.subject}
message: ${ticket.message}
Status: ${t(`TicketStatus_${TicketStatus[Number(ticket.status)]}`)}
Ticket URL: ${ticketUrl}
`;

		let htmMessage = `
<p>Ticket ID: ${ticket.threadId || ticket.id}</p>
<p>Subject: ${ticket.subject}</p>
<p>message: ${ticket.message}</p>
<p>Status: ${t(`TicketStatus_${TicketStatus[Number(ticket.status)]}`)}</p>
<p><a href="${ticketUrl}">Ticket URL</a></p>
`;

		htmMessage = await phasePlaintextToHtm(htmMessage);

		// show thread id if available, otherwise show ticket id
		const subject = `New support request - ticket #${ticket.threadId || ticket.id}`;

		// add to email queue
		const email_queue = await sqlClient.emailQueue.create({
			data: {
				from: "system@riben.life",
				fromName: "system@riben.life (do not reply)",

				to: supportEmail,
				toName: store.name + " " + supportEmail,

				cc: "",
				bcc: "",
				subject: subject,
				textMessage: textMessage,
				htmMessage: htmMessage,
				createdOn: getUtcNow(),
				sendTries: 0,
			},
		});

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		logger.error(`[support-ticket-email] ${error}`);
		return new NextResponse(`Internal error: ${error}`, { status: 500 });
	}
}
