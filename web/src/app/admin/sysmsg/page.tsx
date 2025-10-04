import type { SystemMessage } from "@/../.prisma/client";
import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import { sqlClient } from "@/lib/prismadb";

import { revalidateTag } from "next/cache";
import { Suspense } from "react";
import { SystemMessageClient } from "./components/client-sysmsg";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const customRevalidateTag = (tag: string) => {
	revalidateTag(tag);
};

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

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<SystemMessageClient serverData={messages} />
			</Container>
		</Suspense>
	);
}
