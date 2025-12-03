import { sqlClient } from "@/lib/prismadb";
import { EmailQueue } from "@/types";
import logger from "@/lib/logger";
import { sendMail } from "./send-mail";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

// send the given mailId(s) fromm the mail queue.
//
export const sendGivenMailsInQueue = async (mailQueueIds: string[]) => {
	const log = logger.child({ module: "sendGivenMailsInQueue" });

	// log.info(`mailQueueIds: ${mailQueueIds}`);

	// Get the given mails from queue, regardless of status
	const mailsToSend = (await sqlClient.emailQueue.findMany({
		where: {
			id: { in: mailQueueIds },
			// not sent yet
			//sentOn: null,
			// not failed yet
			//sendTries: {lt: 3},
		},
	})) as EmailQueue[];

	if (mailsToSend.length === 0) {
		// log.info("No emails in queue to process");
		return { processed: 0, success: 0, failed: 0 };
	}

	// log.info(`Processing ${mailsToSend.length} emails from queue`);

	let successCount = 0;
	let failedCount = 0;

	for (const email of mailsToSend) {
		const success = await sendMail(
			email.fromName || "",
			email.from,
			email.to,
			email.subject,
			email.textMessage,
			email.htmMessage,
			email.toName || "",
			email.cc || "",
			email.bcc || "",
		);

		if (success) {
			// Update as sent
			await sqlClient.emailQueue.update({
				where: { id: email.id },
				data: { sentOn: getUtcNowEpoch() },
			});

			// Update the success count
			successCount++;

			// log.info(`Email ${email.id} sent successfully`);
		} else {
			// Update as failed
			await sqlClient.emailQueue.update({
				where: { id: email.id },
				data: { sendTries: { increment: 1 } },
			});

			// Update the failed count
			failedCount++;

			log.warn(`Email ${email.id} failed to send`);
		}
	}

	const mailsSent = (await sqlClient.emailQueue.findMany({
		where: {
			id: { in: mailQueueIds },
		},
	})) as EmailQueue[];

	return {
		mailsSent: mailsSent,
		processed: mailsToSend.length,
		success: successCount,
		failed: failedCount,
	};
};
