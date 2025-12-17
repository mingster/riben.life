import { Suspense } from "react";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { getStoreWithRelations } from "@/lib/store-access";
import { redirect } from "next/navigation";
import { ClientHistory } from "./components/client-history";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { MessageQueue } from "@prisma/client";

type Params = Promise<{ storeId: string }>;

export default async function StoreNotificationHistoryPage(props: {
	params: Params;
}) {
	const params = await props.params;
	const storeId = params.storeId;

	const storeResult = await getStoreWithRelations(storeId, {});
	if (!storeResult) {
		redirect("/storeAdmin");
	}

	// Fetch message queue for this store with delivery statuses
	const messageQueue = await sqlClient.messageQueue.findMany({
		where: {
			storeId,
		},
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
			DeliveryStatuses: {
				select: {
					id: true,
					channel: true,
					status: true,
					deliveredAt: true,
					errorMessage: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
		take: 1000, // Limit initial load
	});

	// Transform BigInt and Decimal to numbers for JSON serialization
	transformPrismaDataForJson(messageQueue);

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<ClientHistory storeId={storeId} initialData={messageQueue as any} />
			</Container>
		</Suspense>
	);
}
