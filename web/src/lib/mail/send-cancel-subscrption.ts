import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import type { User } from "@/types";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { loadOuterHtmTemplate } from "./load-outer-htm-template";
import { phasePlaintextToHtm } from "./phase-plaintext-to-htm";
import { TemplateEngine } from "@/lib/notification/template-engine";
import type { NotificationChannel } from "@/lib/notification/types";
import { buildLifecycleTemplateKey } from "@/lib/notification/template-registry";
import { buildSubscriptionLifecyclePayload } from "@/lib/notification/payload-mappers/subscription-lifecycle-payload";
import { getPlatformAppName } from "@/lib/platform-settings/get-platform-app-name";
import { getPlatformSupportEmail } from "@/lib/platform-settings/get-platform-support-email";

export interface SendCancelSubscriptionInput {
	user: User;
	storeId: string;
	storeName?: string | null;
}

// send email to customer when store subscription is cancelled
//
export const sendCancelSubscription = async ({
	user,
	storeId,
	storeName,
}: SendCancelSubscriptionInput) => {
	const log = logger.child({ module: "sendCancelSubscription" });
	if (!user) {
		log.error("user is required");
		return;
	}
	if (!user.email) {
		log.error("user email is required");
		return;
	}
	if (!storeId) {
		log.error("storeId is required");
		return;
	}

	// 1. get the customer's locale
	const locale = user.locale || "tw";

	/** Message template name: `subscription.cancelled.customer.email`. */
	const channel: NotificationChannel = "email";
	const lifecycleTemplateName = buildLifecycleTemplateKey({
		domain: "subscription",
		event: "cancelled",
		recipient: "customer",
		channel,
	});
	const template = await sqlClient.messageTemplate.findFirst({
		where: { name: lifecycleTemplateName },
		select: { id: true },
	});
	if (!template) {
		log.error(
			`Message template not found for subscription.cancelled.customer.${channel}: ${lifecycleTemplateName}`,
		);
		return;
	}

	const supportEmail = await getPlatformSupportEmail();
	const platformName = await getPlatformAppName();
	const payload = buildSubscriptionLifecyclePayload({
		user,
		storeId,
		storeName,
		platformName,
	});
	const rendered = await new TemplateEngine().render(
		template.id,
		locale,
		{
			...payload,
			support: {
				email: supportEmail,
			},
		},
		{ storeId, channel },
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
	const email_queue = await sqlClient.emailQueue.create({
		data: {
			from: supportEmail,
			fromName: platformName,
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
