import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import type { StoreTables } from "@prisma/client";
import type { TableColumn } from "./components/columns";
import { TableClient } from "./components/table-client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreTablePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	const tables = await sqlClient.storeTables.findMany({
		where: { storeId: params.storeId },
		orderBy: { tableName: "asc" },
	});

	// Map tables to UI columns
	const formattedTables: TableColumn[] = (tables as StoreTables[]).map(
		(item) => ({
			id: item.id,
			storeId: params.storeId,
			tableName: item.tableName,
			capacity: item.capacity,
		}),
	);

	return (
		<Container>
			<TableClient data={formattedTables} />
		</Container>
	);
}
