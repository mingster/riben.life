import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import { sqlClient } from "@/lib/prismadb";
import { formatDateTime } from "@/utils/utils";

import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { StoreColumn } from "./components/columns";
import { StoresClient } from "./components/stores-client";

import { checkAdminAccess } from "../admin-utils";
import type { Store } from "@/types";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const _params = await props.params;

	const isAdmin = await checkAdminAccess();
	if (!isAdmin) redirect("/error/?code=500&message=Unauthorized");

	const stores = (await sqlClient.store.findMany({
		include: {
			Owner: true,
			Products: true,
			StoreOrders: true,
		},
	})) as Store[];

	//console.log(`users: ${JSON.stringify(users)}`);
	// map stores to UI format
	const formattedStores: StoreColumn[] = stores.map((item: Store) => {
		return {
			id: item.id,
			name: item.name || "",
			customDomain: item.customDomain || "",
			owner: item.Owner.email || item.Owner.name || "",
			createdAt: formatDateTime(item.updatedAt),
			products: item.Products.length,
			storeOrders: item.StoreOrders.length,
		};
	});

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<StoresClient data={formattedStores} />
			</Container>
		</Suspense>
	);
}
