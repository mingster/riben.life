import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import { sqlClient } from "@/lib/prismadb";
import type { User } from "@/types";
import { formatDateTime, transformDecimalsToNumbers } from "@/utils/utils";
import { redirect } from "next/navigation";
import { Suspense } from "react";
//import type { UserColumn } from "./components/columns";
import { UsersClient } from "./components/user-client";

import { checkAdminAccess } from "../admin-utils";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// here we save store settings to mangodb
//
export default async function UsersAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const _params = await props.params;

	const isAdmin = await checkAdminAccess();
	if (!isAdmin) redirect("/error/?code=500&message=Unauthorized");

	const users = await sqlClient.user.findMany({
		include: {
			Session: true,
			Orders: true,
			Account: true,
			Addresses: true,
			NotificationTo: {
				take: 0,
			},
		},
	});

	transformDecimalsToNumbers(users);

	//console.log(`users: ${JSON.stringify(users)}`);

	/*
	// map user to ui
	const formattedUsers: UserColumn[] = users.map((item: User) => {
		return {
			id: item.id,
			name: item.name || "",
			username: item.username || "",
			email: item.email || "",
			role: item.role || "",
			createdAt: formatDateTime(item.updatedAt),
			orders: item.Orders,
			currentlySignedIn: item.Session.length > 0,
		};
	});
	*/

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<UsersClient data={users} />
			</Container>
		</Suspense>
	);
}
