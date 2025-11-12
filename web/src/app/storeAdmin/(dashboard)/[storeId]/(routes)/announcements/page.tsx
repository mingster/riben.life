import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { AnnouncementClient } from "./components/client-announcement";
import {
	mapAnnouncementToColumn,
	type AnnouncementColumn,
} from "./announcement-column";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// Store announcements management page
export default async function AnnouncementsAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	const messages = await sqlClient.storeAnnouncement.findMany({
		where: { storeId: params.storeId },
		orderBy: { updatedAt: "desc" },
	});

	const formattedMessages: AnnouncementColumn[] = messages.map((item) =>
		mapAnnouncementToColumn(item, params.storeId),
	);

	return (
		<Container>
			<AnnouncementClient serverData={formattedMessages} />
		</Container>
	);
}
