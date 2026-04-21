"use server";

import { promises as fs } from "fs";
import path from "path";

//load html mail template from public/mail-template.htm and return the template in string
//if the template is not found, return an empty string
export const loadOuterHtmTemplate = async (): Promise<string> => {
	const templatePath = path.join(process.cwd(), "public", "mail-template.htm");
	const exists = await fs
		.access(templatePath)
		.then(() => true)
		.catch(() => false);
	if (!exists) {
		return "";
	}
	const template = await fs.readFile(templatePath, "utf8");

	// Clean any encoding artifacts from the template
	const cleanedTemplate = template
		.replace(/=3D/g, "=")
		.replace(/=0D=0A/g, "\n")
		.replace(/=0A/g, "\n")
		.replace(/=0D/g, "\r")
		// Ensure proper line endings
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n");

	//console.log(template);
	return cleanedTemplate || "";
};
