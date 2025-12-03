import { sqlClient } from "@/lib/prismadb";
import { EmailQueue } from "@/types";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { loadOuterHtmTemplate } from "./load-outer-htm-template";

// add a new email to the mail queue
export const addToMailQueue = async (
	fromName: string,
	from: string,
	to: string,
	subject: string,
	textMessage: string,
	toName?: string,
	cc?: string,
	bcc?: string,
) => {
	// check params
	if (from === "" || to === "" || subject === "" || textMessage === "") {
		throw new Error("Invalid parameters");
	}

	// load loadOuterHtmTemplate
	const outerHtmTemplate = await loadOuterHtmTemplate();

	// replace {{subject}} with the subject
	let htmMessage = outerHtmTemplate.replace("{{subject}}", subject);
	// replace {{message}} with the message
	htmMessage = htmMessage.replace("{{message}}", textMessage);

	// add to queue
	const emailInQueue = (await sqlClient.emailQueue.create({
		data: {
			fromName: fromName || "",
			from: from,
			to: to,
			toName: toName || "",
			subject: subject,
			textMessage: textMessage,
			htmMessage: htmMessage,
			cc: cc || "",
			bcc: bcc || "",
			createdOn: getUtcNowEpoch(),
			sendTries: 0,
		},
	})) as EmailQueue;

	return emailInQueue;
};
