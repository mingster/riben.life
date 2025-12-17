import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { Prisma } from "@prisma/client";
import nodemailer from "nodemailer";

const notificationObj = Prisma.validator<Prisma.MessageQueueDefaultArgs>()({
	include: {
		Sender: true,
		Recipient: true,
	},
});
export type MessageQueue = Prisma.MessageQueueGetPayload<
	typeof notificationObj
>;

export async function sendMail(
	from: string,
	to: string,
	subject: string,
	message: string,
) {
	if (
		process.env.EMAIL_SERVER_HOST === null ||
		process.env.EMAIL_SERVER_HOST === undefined
	) {
		throw new Error("check mail configuration");
	}

	if (
		process.env.EMAIL_SERVER_PORT === null ||
		process.env.EMAIL_SERVER_PORT === undefined
	)
		throw new Error("check mail configuration");

	const host = process.env.EMAIL_SERVER_HOST.toString() as string;
	const port = Number(process.env.EMAIL_SERVER_PORT);

	const transport = nodemailer.createTransport({
		host: host,
		port: port,
		//secure: true, // upgrade later with STARTTLS
		auth: {
			user: process.env.EMAIL_SERVER_USER,
			pass: process.env.EMAIL_SERVER_PASSWORD,
		},
		tls: {
			// do NOT fail on invalid certs
			rejectUnauthorized: false,
		},
	});

	const sendDeamon = "support@riben.life";
	const result = await transport.sendMail({
		from: sendDeamon,
		to: to,
		replyTo: from,
		subject: subject,
		text: `${message}`,
		html: `${message}`,
	});

	const failed = result.rejected.concat(result.pending).filter(Boolean);

	if (failed.length) {
		throw new Error(`Email (${failed.join(", ")}) could not be sent`);
	}

	return true;
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
