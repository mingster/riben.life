import type { SystemMessage } from "@/types";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { SystemMessageClient } from "./components/client-sysmsg";

export default async function SystemMessageAdminPage() {
	const messages = (await sqlClient.systemMessage.findMany({
		orderBy: { createdOn: "desc" },
		include: { locales: true },
	})) as SystemMessage[];

	return (
		<Container>
			<SystemMessageClient serverData={messages} />
		</Container>
	);
}
