import type { StoreFacility } from "@prisma/client";

export interface TableColumn {
	id: string;
	storeId: string;
	tableName: string;
	capacity: number;
}

export const mapStoreTableToColumn = (table: StoreFacility): TableColumn => ({
	id: table.id,
	storeId: table.storeId,
	tableName: table.tableName,
	capacity: table.capacity,
});
