"use server";

import { Loader } from "@/components/loader";
import { sqlClient } from "@/lib/prismadb";
import type { User } from "@/types";
import { Suspense } from "react";
import { CustomersClient } from "./components/client-customer";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// manage customers in this store
//
export default async function CustomersPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const storeId = params.storeId;

	const store = await sqlClient.store.findUnique({
		where: {
			id: storeId,
		},
	});
	// get all member users in the organization
	const members = await sqlClient.member.findMany({
		where: {
			organizationId: store?.organizationId,
		},
	});

	const users = (await sqlClient.user.findMany({
		where: {
			id: {
				in: members.map((member) => member.userId),
			},
		},
		include: {
			sessions: true,
		},
	})) as User[];

	return (
		<Suspense fallback={<Loader />}>
			<CustomersClient serverData={users} />
		</Suspense>
	);
}
