import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import { promises as fs } from "fs";
import path from "path";
import logger from "@/lib/logger";

export async function POST(req: Request) {
	const log = logger.child({ module: "message-template-import" });
	let fileName;

	try {
		({ fileName } = await req.json());
		if (!fileName) {
			return NextResponse.json(
				{ success: false, error: "fileName is required" },
				{ status: 400 },
			);
		}

		const filePath = path.join(process.cwd(), "public", "backup", fileName);
		const fileContent = await fs.readFile(filePath, "utf8");
		const messageTemplates = JSON.parse(fileContent);

		for (const messageTemplate of messageTemplates) {
			// Upsert message template
			await sqlClient.messageTemplate.upsert({
				where: { id: messageTemplate.id },
				update: {
					name: messageTemplate.name,
				},
				create: {
					id: messageTemplate.id,
					name: messageTemplate.name,
				},
			});

			// Upsert message template localizations for this message template
			if (Array.isArray(messageTemplate.MessageTemplateLocalized)) {
				for (const messageTemplateLocalized of messageTemplate.MessageTemplateLocalized) {
					await sqlClient.messageTemplateLocalized.upsert({
						where: { id: messageTemplateLocalized.id },
						update: {
							bCCEmailAddresses: messageTemplateLocalized.bCCEmailAddresses,
							subject: messageTemplateLocalized.subject,
							body: messageTemplateLocalized.body,
							isActive: messageTemplateLocalized.isActive || true,
						},
						create: {
							id: messageTemplateLocalized.id,
							MessageTemplate: {
								connect: {
									id: messageTemplate.id,
								},
							},
							Locale: {
								connect: {
									id: messageTemplateLocalized.localeId,
									//lng: messageTemplateLocalized.localeId,
								},
							},
							bCCEmailAddresses: messageTemplateLocalized.bCCEmailAddresses,
							subject: messageTemplateLocalized.subject,
							body: messageTemplateLocalized.body,
							isActive: messageTemplateLocalized.isActive || true,
						},
					});
				}
			}
		}

		return NextResponse.json({ success: true });
	} catch (error: any) {
		log.error(error, {
			message: "Failed to import message templates",
			metadata: { fileName: fileName },
			tags: ["message-template", "import", "error"],
			service: "message-template-import",
			environment: process.env.NODE_ENV,
			version: process.env.npm_package_version,
		});
		return NextResponse.json(
			{ success: false, error: error?.message || "Unknown error" },
			{ status: 500 },
		);
	}
}
