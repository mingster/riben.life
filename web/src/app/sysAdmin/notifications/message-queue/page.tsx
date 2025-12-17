import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import MessageQueueAdminClient from "./components/client-message-queue";

// Message Queue Admin Page
// Features:
// 1. Review the message queue in the table
// 2. View message details
// 3. Delete selected messages in queue
export default async function MessageQueueAdminPage() {
	const [messageQueue, stores, users] = await Promise.all([
		sqlClient.messageQueue.findMany({
			include: {
				Sender: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
				Recipient: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
			orderBy: {
				createdAt: "desc",
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
		sqlClient.user.findMany({
			select: {
				id: true,
				name: true,
				email: true,
			},
			orderBy: {
				name: "asc",
			},
		}),
	]);

	// Transform BigInt and Decimal to numbers for JSON serialization
	transformPrismaDataForJson(messageQueue);

	return (
		<Container>
			<MessageQueueAdminClient
				initialData={messageQueue as any}
				stores={stores}
				users={users}
			/>
		</Container>
	);
}
