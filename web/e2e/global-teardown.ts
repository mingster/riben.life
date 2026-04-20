/**
 * Global teardown for E2E tests.
 *
 * The test user (e2e-rsvp-test@riben.life.test) is left in place between runs —
 * sign-up is idempotent so re-running tests is safe. Per-test store/facility
 * data is cleaned up by each fixture's afterEach via /api/e2e/cleanup.
 *
 * Nothing to do here, but the file must export a default function so Playwright
 * can resolve globalTeardown correctly.
 */
export default async function globalTeardown() {
	// intentionally empty
}
