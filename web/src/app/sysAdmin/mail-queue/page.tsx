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
	const mailQueue = await sqlClient.emailQueue.findMany({
		orderBy: {
			createdOn: "desc",
		},
	});

	return (
		<Container>
			<MailQueueAdminClient />
			<ClientMailTester />
		</Container>
	);
}
