"use server";

import { sqlClient } from "@/lib/prismadb";
import type { User } from "@/types";
import { UsersClient } from "./components/client-user";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function UsersAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const users = (await sqlClient.user.findMany({
		include: {
			sessions: true,
		},
		orderBy: {
			createdAt: "desc",
		},
	})) as User[];

	return <UsersClient serverData={users} />;
}
