import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import { formatDateTime } from "@/utils/datetime-utils";
import type { Store, StoreAnnouncement } from "@prisma/client";
import type { MessageColumn } from "./components/columns";
import { MessageClient } from "./components/message-client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// Store announcements management page
export default async function AnnouncementsAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Parallel queries for optimal performance
	const [store, messages] = await Promise.all([
		checkStoreStaffAccess(params.storeId),
		sqlClient.storeAnnouncement.findMany({
			where: { storeId: params.storeId },
			orderBy: { updatedAt: "desc" },
		}),
	]);

	// Map announcements to UI columns
	const formattedMessages: MessageColumn[] = (
		messages as StoreAnnouncement[]
	).map((item) => ({
		id: item.id,
		storeId: store.id,
		message: item.message,
		updatedAt: formatDateTime(item.updatedAt),
	}));

	return (
		<Container>
			<MessageClient data={formattedMessages} />
		</Container>
	);
}
