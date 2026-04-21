export const TEST_USER_EMAIL = "e2e-rsvp-test@riben.life.test";
export const TEST_USER_PASSWORD = "E2eRsvpTest123!";
export const TEST_USER_NAME = "E2E Rsvp Tester";

/**
 * Signs up the E2E test user via Better Auth API.
 * Idempotent — silently succeeds even if the user already exists.
 */
export async function signUpTestUser(baseUrl: string): Promise<void> {
	try {
		await fetch(`${baseUrl}/api/auth/sign-up/email`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Origin: baseUrl },
			body: JSON.stringify({
				email: TEST_USER_EMAIL,
				password: TEST_USER_PASSWORD,
				name: TEST_USER_NAME,
			}),
		});
	} catch {
		// Ignore — user may already exist or server may not be up yet
	}
}
