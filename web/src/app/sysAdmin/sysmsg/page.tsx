import type { SystemMessage } from "@/types";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { SystemMessageClient } from "./components/client-sysmsg";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// System Message CRUD - manage platform-wide announcements
export default async function SystemMessageAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const messages = (await sqlClient.systemMessage.findMany({
		orderBy: {
			createdOn: "desc",
		},
	})) as SystemMessage[];

	return (
		<Container>
			<SystemMessageClient serverData={messages} />
		</Container>
	);
}
