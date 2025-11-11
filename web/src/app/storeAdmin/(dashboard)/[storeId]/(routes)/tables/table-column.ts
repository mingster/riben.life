import type { StoreTables } from "@prisma/client";

export interface TableColumn {
	id: string;
	storeId: string;
	tableName: string;
	capacity: number;
}

export const mapStoreTableToColumn = (table: StoreTables): TableColumn => ({
	id: table.id,
	storeId: table.storeId,
	tableName: table.tableName,
	capacity: table.capacity,
});
