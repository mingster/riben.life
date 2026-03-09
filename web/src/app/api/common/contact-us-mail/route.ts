//import { sendMail } from "@/actions/send-store-notification";

import { phasePlaintextToHtm } from "@/actions/mail/phase-plaintext-to-htm";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { verifyRecaptcha } from "@/lib/recaptcha-verify";
import type { StringNVType } from "@/types/enum";
import { NextResponse } from "next/server";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

export async function POST(request: Request) {
	const log = logger.child({ module: "contact-us-mail" });

	try {
		const body = await request.json();

		const { name, email, message, captcha } = body;

		if (!name) {
			return new NextResponse("name is required", { status: 400 });
		}
		if (!email) {
			return new NextResponse("email is required", { status: 401 });
		}
		if (!message) {
			return new NextResponse("message is required", { status: 402 });
		}
		if (!captcha) {
			return new NextResponse("captcha is required", { status: 403 });
		}

		// Verify reCAPTCHA token (standard secret-key verification)
		logger.info("Verifying reCAPTCHA token", {
			metadata: {
				hasToken: !!captcha,
				tokenLength: captcha?.length || 0,
			},
		});
		const recaptchaResult = await verifyRecaptcha(captcha);

		if (!recaptchaResult.success) {
			logger.error("reCAPTCHA verification failed", {
				metadata: {
					error: recaptchaResult.error,
					score: recaptchaResult.score,
					reasons: recaptchaResult.reasons,
				},
			});

			return NextResponse.json(
				{
					success: false,
					error: "reCAPTCHA verification failed",
					score: recaptchaResult.score,
					reasons: recaptchaResult.reasons,
				},
				{ status: 400 },
			);
		}

		logger.info("reCAPTCHA verification successful", {
			metadata: {
				score: recaptchaResult.score,
				reasons: recaptchaResult.reasons,
			},
		});

		const okToSendMail = true;

		// if captcha is good, send mail
		//
		if (okToSendMail) {
			const sender = `${name} <${email}>`;
			// add the email to the queue

			const setting = await sqlClient.platformSettings.findFirst();
			if (!setting) {
				log.error(`🔔 Platform settings not found`);
				return new NextResponse("Platform settings not found", { status: 500 });
			}
			const settingsKV = JSON.parse(
				setting.settings as string,
			) as StringNVType[];
			const supportEmail = settingsKV.find(
				(item) => item.label === "Support.Email",
			);

			const textMessage = `
	name: ${sender}
	email: ${email}
	message: ${message}
	`;

			let htmMessage = `
	<p>name: ${sender}</p>
	<p>email: ${email}</p>
	<p>message: ${message}</p>
	`;

			htmMessage = await phasePlaintextToHtm(htmMessage);

			const email_queue = await sqlClient.emailQueue.create({
				data: {
					from: supportEmail?.value || "support@riben.life",
					fromName: supportEmail?.value || "riben.life",

					to: supportEmail?.value || "support@riben.life",
					toName: supportEmail?.value || "riben.life",

					cc: "",
					bcc: "",
					subject: "contact us from",
					textMessage: textMessage,
					htmMessage: htmMessage,
					createdOn: getUtcNowEpoch(),
					sendTries: 0,
				},
			});

			log.info(`contact us form email created - ${email_queue.id}`);

			return NextResponse.json({ success: true }, { status: 200 });
		}

		return new NextResponse("Captcha failed", { status: 404 });
	} catch (error) {
		log.error(`[contact-us-mail] ${error}`);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
