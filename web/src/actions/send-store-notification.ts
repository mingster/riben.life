import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { Prisma } from "@prisma/client";
import { sendMail as sendMailFromQueue } from "@/actions/mail/send-mail";

const notificationObj = Prisma.validator<Prisma.MessageQueueDefaultArgs>()({
	include: {
		Sender: true,
		Recipient: true,
	},
});
export type MessageQueue = Prisma.MessageQueueGetPayload<
	typeof notificationObj
>;

/**
 * Legacy sendMail function - maintained for backward compatibility
 * @deprecated Use sendMail from @/actions/mail/send-mail instead
 * This function is kept for existing code that uses the simpler signature
 */
export async function sendMail(
	from: string,
	to: string,
	subject: string,
	message: string,
) {
	// Use the consolidated sendMail implementation
	// Convert simple signature to the full signature expected by send-mail.ts
	return await sendMailFromQueue(
		"riben.life", // fromName
		"support@riben.life", // from (platform default)
		to,
		subject,
		message, // textMessage
		message, // htmMessage (same as text for simple messages)
		undefined, // cc
		undefined, // bcc
		undefined, // toName
		3, // retries
	);
}

export async function sendStoreNotification(mailtoSend: MessageQueue) {
	if (mailtoSend === null) return;
	if (mailtoSend.id === null) return;
	if (mailtoSend === null) return;
	if (mailtoSend.Sender.email === null) return;
	if (mailtoSend.Recipient.email === null) return;

	const result = await sendMail(
		"support@riben.life",
		mailtoSend.Recipient.email,
		mailtoSend.subject,
		mailtoSend.message,
	);

	if (result) {
		// update sent status
		const obj = await sqlClient.messageQueue.update({
			where: {
				id: mailtoSend.id,
			},
			data: {
				sentOn: getUtcNowEpoch(),
				sendTries: mailtoSend.sendTries + 1,
			},
		});

		return obj;
	}

	return null;
}

export default sendStoreNotification;
