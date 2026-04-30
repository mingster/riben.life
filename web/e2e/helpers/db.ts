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

export interface CreditRsvpTestStore {
	storeId: string;
	facilityId: string;
	orgId: string;
}

/**
 * Creates a test store configured for prepaid credit RSVP testing.
 * Store has useCustomerCredit=true, facility has a cost, prepay is 100%.
 * Seeds the owner's credit balance with creditToSeed points.
 */
export async function createCreditRsvpTestStore(
	ownerId: string,
	opts: { creditToSeed?: number; facilityCost?: number } = {},
): Promise<CreditRsvpTestStore> {
	const res = await fetch(`${BASE_URL}/api/e2e/credit-rsvp-store-setup`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ ownerId, ...opts }),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`createCreditRsvpTestStore failed (${res.status}): ${text}`);
	}
	return res.json() as Promise<CreditRsvpTestStore>;
}

/** Returns a user's current credit balance (in points). */
export async function getCreditBalance(userId: string): Promise<number> {
	const res = await fetch(`${BASE_URL}/api/e2e/credit-balance?userId=${userId}`);
	if (!res.ok) throw new Error(`getCreditBalance failed (${res.status})`);
	const body = (await res.json()) as { point: number };
	return body.point;
}
