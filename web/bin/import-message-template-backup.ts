#!/usr/bin/env bun

import { importMessageTemplateBackup } from "@/lib/notification/import-message-template-backup";
import { sqlClient } from "@/lib/prismadb";

async function main() {
	const fileName = process.argv[2] || "message-template-backup.json";
	const result = await importMessageTemplateBackup(fileName);
	console.log(
		`Imported ${result.templates} templates and ${result.localizations} localizations from ${fileName}`,
	);
}

main()
	.catch((err: unknown) => {
		console.error(err);
		process.exit(1);
	})
	.finally(async () => {
		await sqlClient.$disconnect();
	});
