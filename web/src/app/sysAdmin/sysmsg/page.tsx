import { Suspense } from "react";
import type { SystemMessage } from "@/types";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { SystemMessageClient } from "./components/client-sysmsg";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// this is CRUD for System Message object/table.
//
export default async function SystemMessageAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	//const _params = await props.params;
	const messages = (await sqlClient.systemMessage.findMany(
		{},
	)) as SystemMessage[];
	//transformBigIntToNumbers(messages);
	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<SystemMessageClient serverData={messages} />
			</Container>
		</Suspense>
	);
}
