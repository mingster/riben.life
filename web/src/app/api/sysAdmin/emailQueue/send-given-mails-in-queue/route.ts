import { type NextRequest, NextResponse } from "next/server";
import { sendGivenMailsInQueue } from "@/actions/mail/send-given-mails-in-queue";

// api to send the given mail(s) in the mail queue
//
export async function POST(request: NextRequest) {
	const { mailQueueIds } = await request.json();
	//console.log("mailQueueIds", mailQueueIds);
	// send the given mail(s) in the mail queue
	const result = await sendGivenMailsInQueue(mailQueueIds);

	//result:
	/*
		mailsSent: mailsSent,
		processed: mailsToSend.length,
		success: successCount,
		failed: failedCount,
	*/
	return NextResponse.json({ result }, { status: 200 });
}
