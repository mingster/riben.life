"use server";

import { Loader } from "@/components/loader";
import { sqlClient } from "@/lib/prismadb";
import type { User } from "@/types";
import logger from "@/lib/logger";
import { Suspense } from "react";
import { UsersClient } from "./components/client-user";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function UsersAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	//const _params = await props.params;
	const log = logger.child({ module: "UsersAdminPage" });
	const users = (await sqlClient.user.findMany({
		include: {
			sessions: true,
		},
		orderBy: {
			createdAt: "desc",
		},
	})) as User[];

	//log.info({ users });

	return (
		<Suspense fallback={<Loader />}>
			<UsersClient serverData={users} />
		</Suspense>
	);
}
