// send email to customer when credit is successful

import { pstvDBPrismaClient } from "@/lib/prisma-client-pstv";
import { NopOrder } from "@/types";
import logger from "@/lib/logger";
import { PhaseTags } from "./phase-tags";
import { loadOuterHtmTemplate } from "./load-outer-htm-template";
import { StringNVType } from "@/types/enum";
import { phasePlaintextToHtm } from "./phase-plaintext-to-htm";

// send credit success email to customer
//
export const sendCreditSuccess = async (order: NopOrder) => {
	const log = logger.child({ module: "sendCreditSuccess" });

	// log.info(`🔔 sending credit success email to customer: ${order.CustomerID}`);

	// 1. get the customer's locale
	const nop_customer = await pstvDBPrismaClient.nop_Customer.findUnique({
		where: {
			CustomerID: order.CustomerID,
		},
	});
	if (!nop_customer) {
		log.error(`🔔 Customer not found: ${order.CustomerID}`);
		return;
	}
	const user = await pstvDBPrismaClient.user.findUnique({
		where: {
			email: nop_customer.Email,
		},
	});
	if (!user) {
		log.error(`🔔 User not found: ${nop_customer.CustomerID}`);
		return;
	}

	//get locale from user's locale or default to tw
	const locale = user.locale || "tw";

	// 2. get needed data for "OrderCompleted.CustomerNotification" Message template

	const message_content_template_id = "OrderCompleted.CustomerNotification";

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

	// 3. phase the message template with the data
	const phased_subject = await PhaseTags(
		message_content_template.subject,
		nop_customer,
		order,
		user,
	);
	const textMessage = await PhaseTags(
		message_content_template.body,
		nop_customer,
		order,
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

	// 4. add the email to the queue
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
	// 5. return the email id
	return email_queue.id;
};
