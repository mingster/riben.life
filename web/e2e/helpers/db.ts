/**
 * DB helpers for E2E tests.
 *
 * All DB operations go through the Next.js dev server's /api/e2e/* endpoints
 * so we never import Prisma (or any compiled-CJS module) inside the Playwright
 * worker process, which runs in ESM context.
 */

const BASE_URL = "http://127.0.0.1:3001";

export interface TestStore {
	storeId: string;
	facilityId: string;
	orgId: string;
	storeName: string;
	facilityName: string;
}

/**
 * Creates a minimal test store (Org → Store → RsvpSettings → Facility) owned by `ownerId`.
 * The store accepts reservations, requires no prepay, and the facility has no business-hour
 * restrictions (slots default to 08:00–22:00 hourly).
 */
export async function createTestStore(ownerId: string): Promise<TestStore> {
	const res = await fetch(`${BASE_URL}/api/e2e/setup`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ ownerId }),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`createTestStore failed (${res.status}): ${text}`);
	}
	return res.json() as Promise<TestStore>;
}

/** Cascade-deletes the test organization and everything under it. */
export async function cleanupTestStore(orgId: string): Promise<void> {
	await fetch(`${BASE_URL}/api/e2e/cleanup`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ orgId }),
	}).catch(() => {
		// Best-effort — don't fail the test if cleanup has a transient error
	});
}
