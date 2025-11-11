import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { formatDateTime } from "@/utils/datetime-utils";
import { redirect } from "next/navigation";
import type { StoreColumn } from "./components/columns";
import { StoresClient } from "./components/stores-client";
import { checkAdminAccess } from "../admin-utils";
import type { Store } from "@/types";
import { Suspense } from "react";
import { Loader } from "@/components/loader";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const _params = await props.params;

	const isAdmin = await checkAdminAccess();
	if (!isAdmin) redirect("/error/?code=500&message=Unauthorized");

	// Optimized query using _count instead of loading all related data
	const stores = await sqlClient.store.findMany({
		include: {
			Owner: {
				select: {
					email: true,
					name: true,
				},
			},
			_count: {
				select: {
					Products: true,
					StoreOrders: true,
				},
			},
		},
		orderBy: {
			updatedAt: "desc",
		},
	});

	// Map stores to UI format
	const formattedStores: StoreColumn[] = stores.map((item) => ({
		id: item.id,
		name: item.name || "",
		customDomain: item.customDomain || "",
		owner: item.Owner.email || item.Owner.name || "",
		createdAt: formatDateTime(item.updatedAt),
		products: item._count.Products,
		storeOrders: item._count.StoreOrders,
	}));

	return (
		<Suspense fallback={<Loader />}>
			<StoresClient data={formattedStores} />
		</Suspense>
	);
}
