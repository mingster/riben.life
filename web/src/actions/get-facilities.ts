import { sqlClient } from "@/lib/prismadb";

import type { StoreFacility } from "@prisma/client";

const getFacilities = async (storeId: string): Promise<StoreFacility[]> => {
	if (!storeId) {
		throw Error("storeId is required");
	}

	const facilities = await sqlClient.storeFacility.findMany({
		where: {
			storeId: storeId,
		},
		orderBy: {
			facilityName: "asc",
		},
	});

	return facilities;
};
export default getFacilities;
