import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import type { User } from "@/types";
import type { StringNVType } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { loadOuterHtmTemplate } from "./load-outer-htm-template";
import { phasePlaintextToHtm } from "./phase-plaintext-to-htm";
import { TemplateEngine } from "@/lib/notification/template-engine";
import { buildLifecycleTemplateKey } from "@/lib/notification/template-registry";

// send email to customer when subscription is cancelled
//
export const sendCancelSubscription = async (user: User) => {
	const log = logger.child({ module: "sendCancelSubscription" });
	if (!user) {
		log.error("user is required");
		return;
	}
	if (!user.email) {
		log.error("user email is required");
		return;
	}

	// 1. get the customer's locale
	const locale = user.locale || "tw";

	const lifecycleTemplateName = buildLifecycleTemplateKey({
		domain: "order",
		event: "cancelled",
		recipient: "customer",
		channel: "email",
	});
	const template =
		(await sqlClient.messageTemplate.findFirst({
			where: { name: lifecycleTemplateName },
			select: { id: true },
		})) ||
		(await sqlClient.messageTemplate.findFirst({
			where: { name: "OrderCancelled.CustomerNotification" },
			select: { id: true },
		}));
	if (!template) {
		log.error(
			`Message template not found: ${lifecycleTemplateName} or OrderCancelled.CustomerNotification`,
		);
		return;
	}

	const rendered = await new TemplateEngine().render(
		template.id,
		locale,
		{
			customer: {
				id: user.id ?? "",
				name: user.name ?? "",
				email: user.email ?? "",
			},
		},
		{ channel: "email" },
	);
	const phased_subject = rendered.subject;
	const textMessage = rendered.body;

	const outerTemplateHtml = await loadOuterHtmTemplate();
	let htmMessage = outerTemplateHtml.replace(
		"{{message}}",
		phasePlaintextToHtm(textMessage),
	);
	//replace {{subject}} with subject multiple times using regex
	htmMessage = htmMessage.replace(/{{subject}}/g, phased_subject);
	htmMessage = htmMessage.replace(/{{footer}}/g, "");

	// 3. add the email to the queue
	const setting = await sqlClient.platformSettings.findFirst();
	if (!setting) {
		log.error(`🔔 Platform settings not found`);
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
			to: user.email || "",
			toName: user.name || "",
			cc: "",
			bcc: "",
			subject: phased_subject,
			textMessage: textMessage,
			htmMessage: htmMessage,
			createdOn: getUtcNowEpoch(),
			sendTries: 0,
		},
	});

	//log.info("queued email created - ", { email_queue });

	// 4. return the email id
	return email_queue.id;
};
