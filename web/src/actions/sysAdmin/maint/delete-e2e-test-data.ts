"use server";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";

export const deleteE2eTestData = async () => {
	// Find e2e org IDs first
	const e2eOrgs = await sqlClient.organization.findMany({
		where: { id: { startsWith: "e2e-" } },
		select: { id: true },
	});
	const orgIds = e2eOrgs.map((o) => o.id);

	if (orgIds.length === 0) return 0;

	const e2eStores = await sqlClient.store.findMany({
		where: { organizationId: { in: orgIds } },
		select: { id: true },
	});
	const storeIds = e2eStores.map((s) => s.id);

	if (storeIds.length > 0) {
		// Delete orders first so OrderItems (which have Restrict on Product) are cleared
		// before Prisma tries to cascade-delete Products from stores.
		await sqlClient.storeOrder.deleteMany({
			where: { storeId: { in: storeIds } },
		});

		// Use store.delete (not deleteMany) one by one: deleteMany with relationMode="prisma"
		// incorrectly batches singular cascades (e.g. ProductAttribute?) across all rows,
		// causing "Expected zero or one element, got N" errors.
		for (const storeId of storeIds) {
			console.log("Deleting store", storeId);
			await sqlClient.store.delete({ where: { id: storeId } });
		}
	}

	// Delete organizations (and any remaining members/invitations)
	const { count } = await sqlClient.organization.deleteMany({
		where: { id: { in: orgIds } },
	});

	logger.info("Deleted e2e test data", {
		metadata: { orgCount: count, storeCount: storeIds.length },
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
