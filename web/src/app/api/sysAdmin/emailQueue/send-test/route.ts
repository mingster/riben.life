import { loadOuterHtmTemplate } from "@/actions/mail/load-outer-htm-template";
import { sendMail } from "@/actions/mail/send-mail";
import { NextRequest } from "next/server";

// api to send a test email
//
export async function POST(request: NextRequest) {
	const { email } = await request.json();
	console.log("send test email to: ", email);

	const txtMessage = "Test";
	const template = await loadOuterHtmTemplate();

	const subject = "Test";
	const footer = "";

	let htmMessage = template.replace("{{message}}", txtMessage);
	//replace {{subject}} with subject multiple times using regex
	htmMessage = htmMessage.replace(/{{subject}}/g, subject);
	htmMessage = htmMessage.replace(/{{footer}}/g, footer);

	const result = await sendMail(
		"riben.life",
		"support@riben.life",
		email,
		subject,
		txtMessage,
		htmMessage,
	);

	//const result = true;
	return new Response(JSON.stringify(result));
}
