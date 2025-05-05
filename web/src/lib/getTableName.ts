import type { StoreTables } from "@prisma/client";

export function getTableName(tables: StoreTables[], tableId: string) {
	return tables.find((table) => table.id === tableId)?.tableName || "";
}
