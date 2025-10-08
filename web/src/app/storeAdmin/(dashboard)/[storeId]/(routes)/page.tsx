//import Scheduled from "@/components/scheduled";
//import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import { checkStoreStaffAccess, isPro } from "@/lib/store-admin-utils";
import type { Store } from "@/types";

import { sqlClient } from "@/lib/prismadb";
import { StoreSubscription } from "@prisma/client";
import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/dist/client/link";
import { Suspense } from "react";
import { StoreAdminDashboard } from "./components/store-admin-dashboard";

export const metadata: Metadata = {
	title: "Store Dashboard",
	description: "",
};

// DashboardPage is home of the selected store. It diesplays store operatiing stat such as
//total revenue, sales count, products, etc..

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreAdminHomePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const store = (await checkStoreStaffAccess(params.storeId)) as Store;
	const hasProLevel = (await isPro(params.storeId)) as boolean;

	//NOTE - display store's to-do list
	// if no category, show prompt
	const categoryCount = await sqlClient.category.count({
		where: {
			storeId: params.storeId,
		},
	});

	// if no product, show prompt
	const productCount = await sqlClient.product.count({
		where: {
			storeId: params.storeId,
		},
	});

	return (
		<Suspense fallback={<Loader />}>
			<div className="text-2xl font-extrabold flex gap-2">
				{categoryCount === 0 && (
					<div className="flex gap-1 items-center">
						<TriangleAlert className="text-yellow-500" />
						<h1 className="sm:text-xl text-2xl tracking-wider">
							<Link href={`/storeAdmin/${params.storeId}/categories/`}>
								請新增分類
							</Link>
						</h1>
					</div>
				)}
				{productCount === 0 && (
					<div className="flex gap-1 items-center">
						<TriangleAlert className="text-yellow-500" />
						<h1 className="sm:text-xl text-2xl tracking-wider">
							<Link href={`/storeAdmin/${params.storeId}/products/`}>
								請新增產品
							</Link>
						</h1>
					</div>
				)}
			</div>

			<StoreAdminDashboard store={store} isProLevel={hasProLevel} />
		</Suspense>
	);
}
