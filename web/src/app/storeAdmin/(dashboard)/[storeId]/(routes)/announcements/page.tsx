import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import { sqlClient } from "@/lib/prismadb";
import { checkStoreAccess } from "@/lib/store-admin-utils";
import { formatDateTime } from "@/utils/utils";
import type { Store, StoreAnnouncement } from "@prisma/client";
import { Suspense } from "react";
import type { MessageColumn } from "./components/columns";
import { MessageClient } from "./components/message-client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// here we save store settings to mangodb
//
export default async function AnnouncementsAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const store = (await checkStoreAccess(params.storeId)) as Store;

	const messages = await sqlClient.storeAnnouncement.findMany({
		where: {
			storeId: store.id,
		},
		orderBy: {
			updatedAt: "asc",
		},
	});

	// map FAQ Category to ui
	const formattedMessages: MessageColumn[] = messages.map(
		(item: StoreAnnouncement) => ({
			id: item.id.toString(),
			storeId: store.id.toString(),
			message: item.message.toString(),
			updatedAt: formatDateTime(item.updatedAt),
		}),
	);

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<MessageClient data={formattedMessages} />
			</Container>
		</Suspense>
	);
}
