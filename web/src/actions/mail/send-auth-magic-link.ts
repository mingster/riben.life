import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { PhaseTags } from "./phase-tags";
import { loadOuterHtmTemplate } from "./load-outer-htm-template";
import type { StringNVType } from "@/types/enum";
import { phasePlaintextToHtm } from "./phase-plaintext-to-htm";
import { User } from "@/types";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

// send auth magic link email to customer
//
export const sendAuthMagicLink = async (
	email: string,
	magicLinkUrl: string,
) => {
	const log = logger.child({ module: "sendAuthMagicLink" });

	// log.info(
	// 	`🔔 sending auth magic link to customer: ${email}. magicLinkUrl: ${magicLinkUrl}`,
	// );

	// 1. get the customer's locale

	const user = await sqlClient.user.findUnique({
		where: {
			email: email,
		},
	});

	//TODO: get system locale??

	//get locale from user's locale or default to tw
	const locale = user?.locale || "tw";

	// 2. get needed data for "Auth.MagicLink" Message template

	const message_content_template_id = "Auth.MagicLink";

	// find the localized message template where messageTemplate name = message_content_template_id,
	//  and localeId = user.locale
	const message_content_template =
		await sqlClient.messageTemplateLocalized.findFirst({
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

	// 3. phase the message template with the data
	const phased_subject = await PhaseTags(
		message_content_template.subject,
		null,
		null,
		user as User,
	);

	let textMessage = await PhaseTags(
		message_content_template.body,
		null,
		null,
		user as User,
	);

	// replace %Customer.MagicLinkURL% with regex
	textMessage = textMessage.replace(/%Customer\.MagicLinkURL%/gi, magicLinkUrl);

	const template = await loadOuterHtmTemplate();
	let htmMessage = template.replace(
		"{{message}}",
		phasePlaintextToHtm(textMessage),
	);

	//replace {{subject}} with subject multiple times using regex
	htmMessage = htmMessage.replace(/{{subject}}/g, phased_subject);
	htmMessage = htmMessage.replace(/{{footer}}/g, "");

	// 4. add the email to the queue
	const setting = await sqlClient.platformSettings.findFirst();
	if (!setting) {
		log.error("🔔 Platform settings not found");
		return;
	}
	const settingsKV = JSON.parse(setting.settings as string) as StringNVType[];
	const supportEmail = settingsKV.find(
		(item) => item.label === "Support.Email",
	);

	const email_queue = await sqlClient.emailQueue.create({
		data: {
			from: supportEmail?.value || "support@riben.life",
			fromName: supportEmail?.value || "riben.life",
			to: email,
			toName: user?.name || email,
			cc: "",
			bcc: message_content_template.bCCEmailAddresses || "",
			subject: phased_subject,
			textMessage: textMessage,
			htmMessage: htmMessage,
			createdOn: getUtcNowEpoch(),
			sendTries: 0,
		},
	});

	//log.info("queued email created - ", { email_queue });

	// 5. return the email id
	return email_queue.id;
};
