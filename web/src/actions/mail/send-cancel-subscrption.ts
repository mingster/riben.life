import { pstvDBPrismaClient } from "@/lib/prisma-client-pstv";
import { User } from "@/types";
import logger from "@/lib/logger";
import { loadOuterHtmTemplate } from "./load-outer-htm-template";
import { PhaseTags } from "./phase-tags";
import { StringNVType } from "@/types/enum";
import { phasePlaintextToHtm } from "./phase-plaintext-to-htm";

// send email to customer when subscription is cancelled
//
export const sendCancelSubscription = async (user: User) => {
	const log = logger.child({ module: "sendCancelSubscription" });
	if (!user) {
		log.error("user is required");
		return;
	}

	// 1. get the customer's locale
	const locale = user.locale || "tw";

	// 2. get the message template
	const message_content_template_id = "OrderCancelled.CustomerNotification";

	// find the localized message template where messageTemplate name = message_content_template_id,
	//  and localeId = user.locale
	const message_content_template =
		await pstvDBPrismaClient.messageTemplateLocalized.findFirst({
			where: {
				MessageTemplate: {
					name: message_content_template_id,
				},
				Locale: {
					lng: locale as string,
				},
			},
		});
	if (!message_content_template) {
		log.error(
			`🔔 Message content template not found: ${message_content_template_id} for locale: ${locale}`,
		);
		return;
	}

	const phased_subject = await PhaseTags(
		message_content_template.subject,
		null,
		null,
		user,
	);

	const textMessage = await PhaseTags(
		message_content_template.body,
		null,
		null,
		user,
	);

	const template = await loadOuterHtmTemplate();
	let htmMessage = template.replace(
		"{{message}}",
		phasePlaintextToHtm(textMessage),
	);
	//replace {{subject}} with subject multiple times using regex
	htmMessage = htmMessage.replace(/{{subject}}/g, phased_subject);
	htmMessage = htmMessage.replace(/{{footer}}/g, "");

	// 3. add the email to the queue
	const setting = await pstvDBPrismaClient.platformSettings.findFirst();
	if (!setting) {
		log.error(`🔔 Platform settings not found`);
		return;
	}
	const settingsKV = JSON.parse(setting.settings as string) as StringNVType[];
	const supportEmail = settingsKV.find(
		(item) => item.label === "Support.Email",
	);

	const email_queue = await pstvDBPrismaClient.emailQueue.create({
		data: {
			from: supportEmail?.value || "support@5ik.tv",
			fromName: supportEmail?.value || "5ik.TV",
			to: user.email,
			toName: user.name || "",
			cc: "",
			bcc: "",
			subject: phased_subject,
			textMessage: textMessage,
			htmMessage: htmMessage,
			createdOn: new Date(),
			sendTries: 0,
		},
	});

	//log.info("queued email created - ", { email_queue });

	// 4. return the email id
	return email_queue.id;
};
