import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import type { User } from "@/types";
import type { StringNVType } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { loadOuterHtmTemplate } from "./load-outer-htm-template";
import { phasePlaintextToHtm } from "./phase-plaintext-to-htm";
import { resolveStoreForAuthEmail } from "./resolve-store-for-auth-email";
import { PhaseTags } from "./phase-tags";

const AUTH_NEW_SIGN_UP_WELCOME_TEMPLATE = "auth.new_sign_up.welcome";

export function shouldSendAuthNewSignUpWelcomeEmail(email: string): boolean {
	const normalized = email.trim().toLowerCase();
	if (!normalized) {
		return false;
	}
	if (normalized.endsWith("@phone.riben.life")) {
		return false;
	}
	if (normalized.startsWith("guest-") && normalized.endsWith("@riben.life")) {
		return false;
	}
	return true;
}

export const sendAuthNewSignUpWelcome = async (
	email: string,
	request?: Request | null,
) => {
	const log = logger.child({ module: "sendAuthNewSignUpWelcome" });
	const normalizedEmail = email.trim();
	if (!shouldSendAuthNewSignUpWelcomeEmail(normalizedEmail)) {
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
					name: AUTH_NEW_SIGN_UP_WELCOME_TEMPLATE,
				},
				Locale: {
					lng: locale as string,
				},
			},
		});

	if (!message_content_template) {
		log.error(
			`Message content template not found: ${AUTH_NEW_SIGN_UP_WELCOME_TEMPLATE} for locale: ${locale}`,
		);
		return;
	}

	const phased_subject = await PhaseTags(
		message_content_template.subject,
		null,
		null,
		user as User,
		storeContext,
	);

	const textMessage = await PhaseTags(
		message_content_template.body,
		null,
		null,
		user as User,
		storeContext,
	);

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
