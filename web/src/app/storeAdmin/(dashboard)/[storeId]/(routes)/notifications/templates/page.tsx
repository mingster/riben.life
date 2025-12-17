import { Suspense } from "react";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { getStoreWithRelations } from "@/lib/store-access";
import { redirect } from "next/navigation";
import { MessageTemplateClient } from "./components/client-message-template";
import type { MessageTemplate, MessageTemplateLocalized } from "@prisma/client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function NotificationTemplatesPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Get store (access check already done in layout)
	const storeResult = await getStoreWithRelations(params.storeId, {});

	if (!storeResult) {
		redirect("/storeAdmin");
	}

	// Fetch templates for this store OR global templates
	const [messageTemplates, messageTemplateLocalized, locales] =
		await Promise.all([
			sqlClient.messageTemplate.findMany({
				where: {
					OR: [
						{ storeId: params.storeId }, // Store-specific templates
						{ isGlobal: true }, // Global templates
					],
				},
				include: {
					MessageTemplateLocalized: true,
					Store: true,
				},
				orderBy: {
					name: "asc",
				},
			}),
			sqlClient.messageTemplateLocalized.findMany({
				where: {
					MessageTemplate: {
						OR: [{ storeId: params.storeId }, { isGlobal: true }],
					},
				},
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
		<Suspense fallback={<Loader />}>
			<Container>
				<MessageTemplateClient
					storeId={params.storeId}
					serverData={
						messageTemplates as (MessageTemplate & {
							MessageTemplateLocalized: MessageTemplateLocalized[];
						})[]
					}
					messageTemplateLocalized={
						messageTemplateLocalized as MessageTemplateLocalized[]
					}
					locales={locales}
				/>
			</Container>
		</Suspense>
	);
}
