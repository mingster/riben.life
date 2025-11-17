import type { StoreFacility } from "@prisma/client";

export function getTableName(tables: StoreFacility[], tableId: string) {
	return tables.find((table) => table.id === tableId)?.tableName || "";
}
