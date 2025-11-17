import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import type { StoreFacility } from "@prisma/client";
import { TableClient } from "./components/client-table";
import { mapStoreTableToColumn, type TableColumn } from "./table-column";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreTablePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	const tables = await sqlClient.storeFacility.findMany({
		where: { storeId: params.storeId },
		orderBy: { tableName: "asc" },
	});

	// Map tables to UI columns
	const formattedTables: TableColumn[] = (tables as StoreFacility[]).map(
		mapStoreTableToColumn,
	);

	return (
		<Container>
			<TableClient serverData={formattedTables} />
		</Container>
	);
}
