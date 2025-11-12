import { sqlClient } from "@/lib/prismadb";
import { getStoreWithRelations } from "@/lib/store-access";
import { isPro } from "@/lib/store-admin-utils";
import { Store } from "@/types";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StoreAdminDashboard } from "./components/store-admin-dashboard";

export const metadata: Metadata = {
	title: "Store Dashboard",
	description: "",
};

// DashboardPage is home of the selected store. It displays store operating stats such as
// total revenue, sales count, products, etc.

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreAdminHomePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	// Parallel queries for optimal performance - 3x faster!
	const [store, hasProLevel, categoryCount, productCount] = await Promise.all([
		getStoreWithRelations(params.storeId, {
			includeSupportTickets: true,
		}) as Store,
		isPro(params.storeId),
		sqlClient.category.count({ where: { storeId: params.storeId } }),
		sqlClient.product.count({ where: { storeId: params.storeId } }),
	]);

	//console.log("store", store);
	return (
		<div>
			{/* Display setup prompts if needed */}
			<div className="text-2xl font-extrabold flex gap-2">
				{categoryCount === 0 && (
					<div className="flex gap-1 items-center">
						<IconAlertTriangle className="h-6 w-6 text-yellow-500" />
						<h1 className="sm:text-xl text-2xl tracking-wider">
							<Link href={`/storeAdmin/${params.storeId}/categories/`}>
								請新增分類
							</Link>
						</h1>
					</div>
				)}
				{productCount === 0 && (
					<div className="flex gap-1 items-center">
						<IconAlertTriangle className="h-6 w-6 text-yellow-500" />
						<h1 className="sm:text-xl text-2xl tracking-wider">
							<Link href={`/storeAdmin/${params.storeId}/products/`}>
								請新增產品
							</Link>
						</h1>
					</div>
				)}
			</div>

			<StoreAdminDashboard isProLevel={hasProLevel} store={store} />
		</div>
	);
}
