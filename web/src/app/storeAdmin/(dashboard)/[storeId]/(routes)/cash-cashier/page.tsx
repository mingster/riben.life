import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import getStoreWithCategories from "@/actions/get-store";
import { sqlClient } from "@/lib/prismadb";
import type { Store } from "@/types";
import type { StoreTables } from "@prisma/client";
import type { Metadata } from "next";
import { CashCashier } from "./data-client";

export const metadata: Metadata = {
	title: "Cash Cashier",
	description: "Cash register and order management",
};

type Params = Promise<{ storeId: string; messageId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function CashCashierAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Parallel queries for optimal performance
	const [_accessCheck, store, tables] = await Promise.all([
		checkStoreStaffAccess(params.storeId),
		getStoreWithCategories(params.storeId),
		sqlClient.storeTables.findMany({
			where: { storeId: params.storeId },
			orderBy: { tableName: "asc" },
		}),
	]);

	return (
		<CashCashier store={store as Store} tables={tables as StoreTables[]} />
	);
}
