import getStoreTables from "@/actions/get-store-tables";
import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import { sqlClient } from "@/lib/prismadb";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import type { Store } from "@/types";
import type { StoreTables } from "@prisma/client";
import { Suspense } from "react";
import type { TableColumn } from "./components/columns";
import { TableClient } from "./components/table-client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreTablePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	const store = (await checkStoreStaffAccess(params.storeId)) as Store;

	const tables = (await getStoreTables(store.id)) as StoreTables[];

	// map FAQ Category to ui
	const formattedTables: TableColumn[] = tables.map((item: StoreTables) => ({
		id: item.id.toString(),
		storeId: store.id.toString(),
		tableName: item.tableName.toString(),
		capacity: item.capacity,
	}));

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<TableClient data={formattedTables} />
			</Container>
		</Suspense>
	);
}
