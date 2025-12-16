import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import MailQueueAdminClient from "./components/client-mail-queue";
import ClientMailTester from "./components/client-mail-tester";

// Mail Queue Admin Page
// Features:
// 1. Review the mail queue in the table
// 2. Send selected mail in queue
// 3. Review send result in console log
// 4. Delete selected mail in queue
// 5. Call sendMailsInQueue from a button click
export default async function MailQueueAdminPage() {
	const [mailQueue, stores, messageTemplates] = await Promise.all([
		sqlClient.emailQueue.findMany({
			orderBy: {
				createdOn: "desc",
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
		sqlClient.messageTemplate.findMany({
			select: {
				id: true,
				name: true,
			},
			orderBy: {
				name: "asc",
			},
		}),
	]);

	return (
		<Container>
			<MailQueueAdminClient
				stores={stores}
				messageTemplates={messageTemplates}
			/>
			<ClientMailTester />
		</Container>
	);
}
