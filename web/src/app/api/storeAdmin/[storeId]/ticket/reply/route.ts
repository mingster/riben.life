//import { sendMail } from "@/actions/send-store-notification";

import { NextResponse } from "next/server";
import { phasePlaintextToHtm } from "@/actions/mail/phase-plaintext-to-htm";
import type { SupportTicket, User } from "@/types";
import { TicketStatus, type StringNVType } from "@/types/enum";
import logger from "@/lib/logger";
import { getServerUrl } from "@/actions/server-util";
import { getT } from "@/app/i18n";
import { loadOuterHtmTemplate } from "@/actions/mail/load-outer-htm-template";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNow } from "@/utils/datetime-utils";

// send message back to customer when admin replies support ticket
//
export async function PATCH(
	req: Request,
	//props: { params: Promise<{ storeId: string }> },
) {
	//const params = await props.params;
	//const storeId = params.storeId;

	//try {
	const body = await req.json();

	// expect body to be a SupportTicket
	const ticket = body as SupportTicket;

	if (!ticket) {
		return new NextResponse("ticket is required", { status: 400 });
	}

	const rootTicket = await sqlClient.supportTicket.findFirst({
		where: {
			id: ticket.threadId || ticket.id,
		},
	});

	if (!rootTicket) {
		return new NextResponse("root ticket not found", { status: 400 });
	}

	const ticketOwner = (await sqlClient.user.findFirst({
		where: {
			id: rootTicket.senderId,
		},
	})) as User;

	//const sender = ticket.modifier;

	/*
	const setting = await sqlClient.platformSettings.findFirst();
	if (!setting) {
		logger.error("🔔 Platform settings not found");
		return new NextResponse("Platform settings not found", { status: 500 });
	}
	const settingsKV = JSON.parse(setting.settings as string) as StringNVType[];
	const supportEmail = settingsKV.find(
		(item) => item.label === "Support.Email",
	);
	*/

	// get the server url
	const serverUrl = await getServerUrl();
	const ticketUrl = `${serverUrl}/${ticket.storeId}/support/?ticketId=${ticket.threadId || ticket.id}`;
	const { t } = await getT();

	// show thread id if available, otherwise show ticket id
	const subject = `RE:support ticket #${ticket.threadId || ticket.id} - ${ticket.subject}`;

	const textMessage = `	
Ticket ID: ${ticket.threadId || ticket.id}
Subject: ${ticket.subject}
message: ${ticket.message}
Status: ${t(`TicketStatus_${TicketStatus[Number(ticket.status)]}`)}
Ticket URL: ${ticketUrl}
`;

	const template = await loadOuterHtmTemplate();
	let htmMessage = template.replace(
		"{{message}}",
		phasePlaintextToHtm(textMessage),
	);

	//replace {{subject}} with subject multiple times using regex
	htmMessage = htmMessage.replace(/{{subject}}/g, subject);
	htmMessage = htmMessage.replace(/{{footer}}/g, "");

	/*
		let htmMessage = `
	<p>Ticket ID: ${ticket.threadId || ticket.id}</p>
	<p>Subject: ${ticket.subject}</p>
	<p>message: ${ticket.message}</p>
	<p>Status: ${t(`TicketStatus_${TicketStatus[Number(ticket.status)]}`)}</p>
	<p><a href="${ticketUrl}">Ticket URL</a></p>
	`;
		htmMessage = await phasePlaintextToHtm(htmMessage);
	
	*/

	// add to email queue
	const email_queue = await sqlClient.emailQueue.create({
		data: {
			from: "system@riben.life",
			fromName: "system@riben.life (do not reply)",

			to: ticketOwner.email || "",
			toName:
				ticketOwner.name && ticketOwner.email
					? `${ticketOwner.name} <${ticketOwner.email}>`
					: ticketOwner.email || "",

			cc: "",
			bcc: "",
			subject: subject,
			textMessage: textMessage,
			htmMessage: htmMessage,
			createdOn: getUtcNowEpoch(),
			sendTries: 0,
		},
	});

	return NextResponse.json({ success: true }, { status: 200 });
	/*
} catch (error) {
	logger.error(`[support-ticket-email] ${error}`);
	return new NextResponse(`Internal error${error}`, { status: 500 });
}*/
}
