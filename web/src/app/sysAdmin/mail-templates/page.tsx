"use server";
import { Suspense } from "react";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import type { MessageTemplate, MessageTemplateLocalized } from "@prisma/client";
import { MessageTemplateClient } from "./components/client-message-template";

//type Params = Promise<{ storeId: string }>;
//type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function MailTemplateAdminPage(props: {
	//params: Params;
	//searchParams: SearchParams;
}) {
	//const _params = await props.params;

	//get all message templates
	const messageTemplates = (await sqlClient.messageTemplate.findMany({
		include: {
			MessageTemplateLocalized: true,
		},
		orderBy: {
			name: "asc",
		},
	})) as MessageTemplate[];

	//get all message template localized
	const messageTemplateLocalized =
		(await sqlClient.messageTemplateLocalized.findMany({
			include: {
				MessageTemplate: true,
			},
			orderBy: {
				subject: "asc",
			},
		})) as MessageTemplateLocalized[];

	//console.log("messageTemplateLocalized", messageTemplateLocalized);

	//get all locales
	const locales = await sqlClient.locale.findMany();

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<MessageTemplateClient
					serverData={messageTemplates}
					messageTemplateLocalized={messageTemplateLocalized}
					locales={locales}
				/>
			</Container>
		</Suspense>
	);
}
