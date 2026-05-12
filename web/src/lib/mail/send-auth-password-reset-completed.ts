import logger from "@/lib/logger";
import { applyAuthEmailMustacheValues } from "@/lib/notification/template-migration-compat";
import { sqlClient } from "@/lib/prismadb";
import type { User } from "@/types";
import type { StringNVType } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { loadOuterHtmTemplate } from "./load-outer-htm-template";
import { phasePlaintextToHtm } from "./phase-plaintext-to-htm";
import { resolveStoreForAuthEmail } from "./resolve-store-for-auth-email";
import { PhaseTags } from "./phase-tags";

const AUTH_PASSWORD_RESET_COMPLETED_TEMPLATE = "auth.password_reset";

export const sendAuthPasswordResetCompleted = async (
	email: string,
	newPassword: string,
	request?: Request | null,
) => {
	const log = logger.child({ module: "sendAuthPasswordResetCompleted" });
	const normalizedEmail = email.trim();
	if (!normalizedEmail) {
		return;
	}

	const storeContext = await resolveStoreForAuthEmail("", request ?? null);

	const user = await sqlClient.user.findUnique({
		where: {
			email: normalizedEmail,
		},
	});

	const locale = user?.locale || "tw";

	const message_content_template =
		await sqlClient.messageTemplateLocalized.findFirst({
			where: {
				MessageTemplate: {
					name: AUTH_PASSWORD_RESET_COMPLETED_TEMPLATE,
				},
				Locale: {
					lng: locale as string,
				},
			},
		});

	if (!message_content_template) {
		log.error(
			`Message content template not found: ${AUTH_PASSWORD_RESET_COMPLETED_TEMPLATE} for locale: ${locale}`,
		);
		return;
	}

	let phased_subject = await PhaseTags(
		message_content_template.subject,
		null,
		null,
		user as User,
		storeContext,
	);
	phased_subject = applyAuthEmailMustacheValues(phased_subject, {
		newPassword,
	});

	let textMessage = await PhaseTags(
		message_content_template.body,
		null,
		null,
		user as User,
		storeContext,
	);
	textMessage = applyAuthEmailMustacheValues(textMessage, { newPassword });

	const template = await loadOuterHtmTemplate();
	let htmMessage = template.replace(
		"{{message}}",
		phasePlaintextToHtm(textMessage),
	);

	htmMessage = htmMessage.replace(/{{subject}}/g, phased_subject);
	htmMessage = htmMessage.replace(/{{footer}}/g, "");

	const setting = await sqlClient.platformSettings.findFirst();
	if (!setting) {
		log.error("Platform settings not found");
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
			to: normalizedEmail,
			toName: user?.name || normalizedEmail,
			cc: "",
			bcc: message_content_template.bCCEmailAddresses || "",
			subject: phased_subject,
			textMessage: textMessage,
			htmMessage: htmMessage,
			createdOn: getUtcNowEpoch(),
			sendTries: 0,
		},
	});

	return email_queue.id;
};
