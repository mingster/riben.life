"use server";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import type { MessageTemplate, MessageTemplateLocalized } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import { MessageTemplateClient } from "./components/client-message-template";

export default async function MailTemplateAdminPage() {
	const [messageTemplates, locales, stores] = await Promise.all([
		sqlClient.messageTemplate.findMany({
			include: {
				MessageTemplateLocalized: true,
				Store: true,
			},
			orderBy: { name: "asc" },
		}),
		sqlClient.locale.findMany({ orderBy: { name: "asc" } }),
		sqlClient.store.findMany({
			select: { id: true, name: true },
			orderBy: { name: "asc" },
		}),
	]);

	transformPrismaDataForJson(messageTemplates);
	transformPrismaDataForJson(locales);
	transformPrismaDataForJson(stores);

	return (
		<Container>
			<MessageTemplateClient
				serverData={
					messageTemplates as (MessageTemplate & {
						MessageTemplateLocalized: MessageTemplateLocalized[];
					})[]
				}
				locales={locales}
				stores={stores}
			/>
		</Container>
	);
}
