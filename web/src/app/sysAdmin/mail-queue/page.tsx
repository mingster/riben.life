import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { Suspense } from "react";
import MailQueueAdminClient from "./components/client-mail-queue";
import ClientMailTester from "./components/client-mail-tester";

// MailQueueAdminPage provides the following features:
// 1. review the mail queue in the table
// 2. send selected mail in queue
// 3. review send result in console log
// 4. delete selected mail in queue
// 5. call sendMailsInQueue from a button click
//
export default async function MailQueueAdminPage() {
	const log = logger.child({ module: "MailQueueAdminPage" });

	const mailQueue = await sqlClient.emailQueue.findMany({
		orderBy: {
			createdOn: "desc",
		},
	});

	//log.info({ mailQueue });

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<MailQueueAdminClient />
				<ClientMailTester />
			</Container>
		</Suspense>
	);
}
