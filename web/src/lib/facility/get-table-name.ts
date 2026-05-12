import type { StoreFacility } from "@prisma/client";

export function getTableName(tables: StoreFacility[], facilityId: string) {
	return tables.find((table) => table.id === facilityId)?.facilityName || "";
}
