"use server";

import { promises as fs } from "fs";
import path from "path";
import {
	getPlatformEmailTemplate,
	getBaseUrlForMail,
} from "@/lib/notification/email-template";

/**
 * Load HTML mail template. Uses public/mail-template.htm if present;
 * otherwise returns the platform email template (favicon as logo).
 * Placeholders: {{subject}}, {{message}}, {{footer}}
 */
export const loadOuterHtmTemplate = async (): Promise<string> => {
	const templatePath = path.join(process.cwd(), "public", "mail-template.htm");
	const exists = await fs
		.access(templatePath)
		.then(() => true)
		.catch(() => false);
	if (exists) {
		const template = await fs.readFile(templatePath, "utf8");
		const cleanedTemplate = template
			.replace(/=3D/g, "=")
			.replace(/=0D=0A/g, "\n")
			.replace(/=0A/g, "\n")
			.replace(/=0D/g, "\r")
			.replace(/\r\n/g, "\n")
			.replace(/\r/g, "\n");
		return cleanedTemplate || "";
	}
	return getPlatformEmailTemplate(getBaseUrlForMail());
};
