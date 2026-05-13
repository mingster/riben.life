import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import type { StoreOrder } from "@/types";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { loadOuterHtmTemplate } from "@/lib/mail/load-outer-htm-template";
import { phasePlaintextToHtm } from "@/lib/mail/phase-plaintext-to-htm";
import { TemplateEngine } from "@/lib/notification/template-engine";
import { buildLifecycleTemplateKey } from "@/lib/notification/template-registry";
import { buildOrderLifecyclePayload } from "@/lib/notification/payload-mappers/order-lifecycle-payload";
import { getPlatformSupportEmail } from "@/lib/platform-settings/get-platform-support-email";

// send credit success email to customer
//
export const sendCreditSuccess = async (order: StoreOrder) => {
	const log = logger.child({ module: "sendCreditSuccess" });

	// log.info(`🔔 sending credit success email to customer: ${order.CustomerID}`);

	// 1. get the customer's locale
	if (!order.User) {
		log.error(`🔔 User not found: ${order.User}`);
		return;
	}

	const user = await sqlClient.user.findUnique({
		where: {
			id: order.User?.id || "",
		},
	});
	if (!user) {
		log.error(`🔔 User not found: ${order.User?.id}`);
		return;
	}

	const locale = user.locale || "tw";
	const lifecycleTemplateName = buildLifecycleTemplateKey({
		domain: "order",
		event: "credit_topup_completed",
		recipient: "customer",
		channel: "email",
	});
	const template =
		(await sqlClient.messageTemplate.findFirst({
			where: { name: lifecycleTemplateName },
			select: { id: true },
		})) ||
		(await sqlClient.messageTemplate.findFirst({
			where: { name: "OrderCompleted.CustomerNotification" },
			select: { id: true },
		}));
	if (!template) {
		log.error(
			`Message template not found: ${lifecycleTemplateName} or OrderCompleted.CustomerNotification`,
		);
		return;
	}
	const payload = buildOrderLifecyclePayload({ order, user, locale });
	const supportEmail = await getPlatformSupportEmail();
	const rendered = await new TemplateEngine().render(
		template.id,
		locale,
		{
			...payload,
			support: {
				email: supportEmail,
			},
		},
		{
			storeId: order.storeId,
			channel: "email",
		},
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

	// 4. add the email to the queue
	const email_queue = await sqlClient.emailQueue.create({
		data: {
			from: supportEmail,
			fromName: "riben.life",
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
	// 5. return the email id
	return email_queue.id;
};
