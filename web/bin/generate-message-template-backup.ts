#!/usr/bin/env bun

import { promises as fs } from "node:fs";
import path from "node:path";
import { sqlClient } from "@/lib/prismadb";

interface LifecycleTemplate {
	subject: string;
	body: string;
}

interface LifecycleSeedV2 {
	domains: Record<string, string[]>;
	recipients: string[];
	channels: string[];
	locales: string[];
	recipientLabels: Record<string, Record<string, string>>;
	templates: Record<string, LifecycleTemplate>;
}

interface BackupFile {
	version: string;
	lifecycleSeedV2: LifecycleSeedV2;
}

function defaultRecipientLabel(localeId: string, recipient: string): string {
	if (recipient === "customer") {
		if (localeId === "zh-TW") return "顧客";
		if (localeId === "ja-JP") return "お客様";
		return "Customer";
	}
	if (recipient === "staff") {
		if (localeId === "zh-TW") return "店內同仁";
		if (localeId === "ja-JP") return "スタッフ";
		return "Store staff";
	}
	return recipient;
}

async function main() {
	const backupDir = path.resolve(process.cwd(), "public", "backup");
	const sourcePath = path.resolve(
		backupDir,
		"message-template-lifecycle-v2-seed.json",
	);
	const outputPath = path.resolve(backupDir, "message-template-backup.json");

	const sourceRaw = await fs.readFile(sourcePath, "utf8");
	const source = JSON.parse(sourceRaw) as BackupFile;
	const seed = source.lifecycleSeedV2;

	const localeRows = await sqlClient.locale.findMany({
		select: { id: true },
		orderBy: { id: "asc" },
	});
	const localeIds = localeRows.map((row) => row.id);

	const baseLocaleId =
		(localeIds.includes("en-US") && "en-US") ||
		(localeIds.includes("zh-TW") && "zh-TW") ||
		localeIds[0];
	if (!baseLocaleId) {
		throw new Error("No locales found in database");
	}

	const nextRecipientLabels: Record<string, Record<string, string>> = {};
	const nextTemplates: Record<string, LifecycleTemplate> = {};

	for (const localeId of localeIds) {
		const sourceLabels =
			seed.recipientLabels[localeId] ?? seed.recipientLabels[baseLocaleId] ?? {};
		const sourceTemplate = seed.templates[localeId] ?? seed.templates[baseLocaleId];
		if (!sourceTemplate) {
			throw new Error(`Missing source template for base locale ${baseLocaleId}`);
		}

		nextRecipientLabels[localeId] = {
			customer:
				sourceLabels.customer ?? defaultRecipientLabel(localeId, "customer"),
			staff: sourceLabels.staff ?? defaultRecipientLabel(localeId, "staff"),
		};

		nextTemplates[localeId] = {
			subject: sourceTemplate.subject,
			body: sourceTemplate.body,
		};
	}

	const output: BackupFile = {
		version: "lifecycle-v2",
		lifecycleSeedV2: {
			...seed,
			locales: localeIds,
			recipientLabels: nextRecipientLabels,
			templates: nextTemplates,
		},
	};

	await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
	console.log(`Generated ${outputPath}`);
}

main()
	.catch((err: unknown) => {
		console.error(err);
		process.exit(1);
	})
	.finally(async () => {
		await sqlClient.$disconnect();
	});
