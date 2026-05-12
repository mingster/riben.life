import type { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

type SqlOrTx = Pick<typeof sqlClient, "waitListSettings">;

/**
 * Ensures a `WaitListSettings` row exists for the store (idempotent).
 * Call after creating `RsvpSettings` or when toggling systems that need the row.
 */
export async function ensureWaitListSettingsRow(
	db: SqlOrTx,
	storeId: string,
): Promise<void> {
	const existing = await db.waitListSettings.findUnique({
		where: { storeId },
		select: { id: true },
	});
	if (existing) {
		return;
	}
	const now = getUtcNowEpoch();
	await db.waitListSettings.create({
		data: {
			storeId,
			enabled: false,
			requireSignIn: false,
			requireName: false,
			requirePhone: false,
			requireLineOnly: false,
			createdAt: now,
			updatedAt: now,
		},
	});
}
