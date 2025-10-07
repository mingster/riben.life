import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { sqlClient } from "@/lib/prismadb";

export async function POST() {
	try {
		// Fetch all message template localizations
		const messageTemplates = await sqlClient.messageTemplate.findMany({
			include: {
				MessageTemplateLocalized: true,
			},
		});

		// Prepare backup directory
		const backupDir = path.join(process.cwd(), "public", "backup");
		await fs.mkdir(backupDir, { recursive: true });

		// Prepare file name
		const now = new Date();
		const pad = (n: number) => n.toString().padStart(2, "0");
		const fileName = `message-template-backup-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.json`;
		const filePath = path.join(backupDir, fileName);

		// Write data to file
		await fs.writeFile(
			filePath,
			JSON.stringify(messageTemplates, null, 2),
			"utf8",
		);

		return NextResponse.json({ success: true, fileName });
	} catch (error: any) {
		console.error("[MESSAGE_TEMPLATE_EXPORT]", error);
		return NextResponse.json(
			{ success: false, error: error?.message || "Unknown error" },
			{ status: 500 },
		);
	}
}
