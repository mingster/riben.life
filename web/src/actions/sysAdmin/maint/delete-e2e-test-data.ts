"use server";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";

export const deleteE2eTestData = async () => {
	const { count } = await sqlClient.organization.deleteMany({
		where: { id: { startsWith: "e2e-" } },
	});

	logger.info("Deleted e2e test data", {
		metadata: { orgCount: count },
		tags: ["action", "maintenance", "e2e-cleanup"],
	});

	return count;
};

export const getE2eTestDataCount = async () => {
	const [orgCount, storeCount] = await Promise.all([
		sqlClient.organization.count({ where: { id: { startsWith: "e2e-" } } }),
		sqlClient.store.count({
			where: { organizationId: { startsWith: "e2e-" } },
		}),
	]);
	return { orgCount, storeCount };
};
