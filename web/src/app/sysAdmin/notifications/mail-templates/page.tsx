"use server";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import type { MessageTemplate, MessageTemplateLocalized } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import { MessageTemplateClient } from "./components/client-message-template";

export default async function MailTemplateAdminPage() {
	// Parallel queries for optimal performance - 3x faster!
	const [messageTemplates, messageTemplateLocalized, locales, stores] =
		await Promise.all([
			sqlClient.messageTemplate.findMany({
				include: {
					MessageTemplateLocalized: true,
					Store: true,
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
			sqlClient.store.findMany({
				select: {
					id: true,
					name: true,
				},
				orderBy: {
					name: "asc",
				},
			}),
		]);

	// Transform BigInt (epoch timestamps) and Decimal to numbers for JSON serialization
	// This prevents hydration mismatches when passing data to client components
	transformPrismaDataForJson(messageTemplates);
	transformPrismaDataForJson(messageTemplateLocalized);
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
				messageTemplateLocalized={
					messageTemplateLocalized as MessageTemplateLocalized[]
				}
				locales={locales}
				stores={stores}
			/>
		</Container>
	);
}
