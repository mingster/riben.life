// api to send mails in queue

import { NextResponse } from "next/server";
import { sendMailsInQueue } from "@/actions/mail/send-mails-in-queue";

export async function POST() {
	// send mails in queue
	const result = await sendMailsInQueue();
	return NextResponse.json({ result });
}
