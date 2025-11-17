import { sqlClient } from "@/lib/prismadb";

import type { StoreFacility } from "@prisma/client";

const getStoreTables = async (storeId: string): Promise<StoreFacility[]> => {
	if (!storeId) {
		throw Error("storeId is required");
	}

	const tables = await sqlClient.storeFacility.findMany({
		where: {
			storeId: storeId,
		},
		orderBy: {
			tableName: "asc",
		},
	});

	return tables;
};
export default getStoreTables;
