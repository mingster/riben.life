import { sendMailsInQueue } from "@/actions/mail/send-mails-in-queue";
import { NextResponse } from "next/server";

// api to cancel subscription.
//
export async function GET(req: Request) {
	const results = await sendMailsInQueue();

	return NextResponse.json({ results }, { status: 200 });
}
