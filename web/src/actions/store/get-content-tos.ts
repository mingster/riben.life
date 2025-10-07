"use server";
import fs from "node:fs";

export async function GetContentTos() {
	const termsfilePath = `${process.cwd()}/public/defaults/terms.md`;
	const tos = fs.readFileSync(termsfilePath, "utf8");

	return tos;
}
