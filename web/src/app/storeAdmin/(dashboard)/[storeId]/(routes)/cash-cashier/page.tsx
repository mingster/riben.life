import { sqlClient } from "@/lib/prismadb";
import { getStoreWithRelations } from "@/lib/store-access";
import type { Store } from "@/types";
import type { StoreFacility } from "@prisma/client";
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

	// Note: checkStoreStaffAccess already called in layout (cached)
	// Parallel queries for optimal performance
	const [store, tables] = await Promise.all([
		await getStoreWithRelations(params.storeId),
		sqlClient.storeFacility.findMany({
			where: { storeId: params.storeId },
			orderBy: { facilityName: "asc" },
		}),
	]);

	return (
		<CashCashier store={store as Store} tables={tables as StoreFacility[]} />
	);
}
