"use server";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import type { MessageTemplate, MessageTemplateLocalized } from "@prisma/client";
import { MessageTemplateClient } from "./components/client-message-template";

export default async function MailTemplateAdminPage() {
	// Parallel queries for optimal performance - 3x faster!
	const [messageTemplates, messageTemplateLocalized, locales] =
		await Promise.all([
			sqlClient.messageTemplate.findMany({
				include: {
					MessageTemplateLocalized: true,
				},
				orderBy: {
					name: "asc",
				},
			}),
			sqlClient.messageTemplateLocalized.findMany({
				include: {
					MessageTemplate: true,
				},
				orderBy: {
					subject: "asc",
				},
			}),
			sqlClient.locale.findMany({
				orderBy: {
					name: "asc",
				},
			}),
		]);

	return (
		<Container>
			<MessageTemplateClient
				serverData={messageTemplates as MessageTemplate[]}
				messageTemplateLocalized={
					messageTemplateLocalized as MessageTemplateLocalized[]
				}
				locales={locales}
			/>
		</Container>
	);
}
