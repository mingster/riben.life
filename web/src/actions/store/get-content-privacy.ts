"use server";
import fs from "node:fs";

export async function GetContentPrivacy() {
	const filePath = `${process.cwd()}/public/defaults/privacy.md`;
	const privacyPolicy = fs.readFileSync(filePath, "utf8");

	return privacyPolicy;
}
