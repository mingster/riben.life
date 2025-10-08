import { Loader } from "@/components/loader";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";

import getStoreWithCategories from "@/actions/get-store";
import { sqlClient } from "@/lib/prismadb";
import type { Store } from "@/types";
import type { StoreTables } from "@prisma/client";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CashCashier } from "./data-client";

export const metadata: Metadata = {
	title: "Store Dashboard - Cash Cashier",
	description: "",
};

// DashboardPage is home of the selected store. It diesplays store operatiing stat such as
//total revenue, sales count, products, etc..

type Params = Promise<{ storeId: string; messageId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function CashCashierAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	await checkStoreStaffAccess(params.storeId);
	const store = (await getStoreWithCategories(params.storeId)) as Store;

	const tables = (await sqlClient.storeTables.findMany({
		where: {
			storeId: store.id,
		},
		orderBy: {
			tableName: "asc",
		},
	})) as StoreTables[];

	return (
		<Suspense fallback={<Loader />}>
			<CashCashier store={store} tables={tables} />
		</Suspense>
	);
}
