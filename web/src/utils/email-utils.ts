/**
 * Email Utility Functions
 * Helper functions for email validation and detection
 */

/**
 * Check if an email address is fake/generated
 * Generated emails are typically:
 * - @import.riben.life (imported customers)
 * - @phone.riben.life (phone-based sign-ups)
 * - @example.com (test emails)
 * - noreply@, no-reply@ (system emails)
 */
export function isFakeEmail(email: string | null | undefined): boolean {
	if (!email) {
		return true; // No email is considered fake
	}

	const normalized = email.toLowerCase().trim();

	// Check for known fake/generated email patterns
	const fakePatterns = [
		/@import\.riben\.life$/i, // Imported customers
		/@phone\.riben\.life$/i, // Phone-based sign-ups
		/@example\.com$/i, // Test emails
		/^noreply@/i, // No-reply emails
		/^no-reply@/i, // No-reply emails (alternative)
		/^temp-/i, // Temporary emails
		/@test\./i, // Test domains
		/@localhost/i, // Local development
	];

	return fakePatterns.some((pattern) => pattern.test(normalized));
}

/**
 * Check if email is valid (not null/undefined and not fake)
 */
export function isValidEmail(email: string | null | undefined): boolean {
	if (!email) {
		return false;
	}

	// Basic email format validation
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return false;
	}

	// Check if it's not a fake email
	return !isFakeEmail(email);
}
