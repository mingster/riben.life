import { promises as fs } from "fs";
import path from "path";

/** Load HTML mail wrapper from `public/mail-template.htm`; returns empty string if missing. */
export async function loadOuterHtmTemplate(): Promise<string> {
	const templatePath = path.join(process.cwd(), "public", "mail-template.htm");
	const exists = await fs
		.access(templatePath)
		.then(() => true)
		.catch(() => false);
	if (!exists) {
		return "";
	}
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
