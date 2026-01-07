"use server";

import { Loader } from "@/components/loader";
import { sqlClient } from "@/lib/prismadb";
import type { User } from "@/types";
import { transformPrismaDataForJson } from "@/utils/utils";
import { Suspense } from "react";
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

	// Transform BigInt (epoch timestamps) and Decimal to numbers for JSON serialization
	transformPrismaDataForJson(users);

	return (
		<Suspense fallback={<Loader />}>
			<UsersClient serverData={users} />
		</Suspense>
	);
}
