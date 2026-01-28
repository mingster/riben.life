import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";

/**
 * Normalize phone number to E.164 format
 * @param phoneNumber - Phone number in any format
 * @returns Normalized phone number in E.164 format (e.g., +886912345678)
 */
export function normalizePhoneNumber(phoneNumber: string): string {
	try {
		// Remove spaces, dashes, parentheses
		let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, "");

		// Handle Taiwan numbers that start with 0 (e.g., 0988000123 -> +886988000123)
		// Taiwan local format: 09XXXXXXXX (10 digits) or 9XXXXXXXX (9 digits)
		if (/^09\d{8}$/.test(cleaned)) {
			// Remove leading 0 and add +886 country code
			cleaned = "+886" + cleaned.slice(1);
		} else if (/^9\d{8}$/.test(cleaned)) {
			// Add +886 country code for 9-digit Taiwan numbers
			cleaned = "+886" + cleaned;
		}

		// Parse and normalize to E.164
		const parsed = parsePhoneNumber(cleaned);
		return parsed.number; // Returns E.164 format (e.g., +886912345678)
	} catch (error) {
		// If parsing fails, try to add + prefix if missing
		if (!phoneNumber.startsWith("+")) {
			return `+${phoneNumber}`;
		}
		return phoneNumber;
	}
}

/**
 * Validate phone number format
 * @param phoneNumber - Phone number in E.164 format
 * @returns true if valid, false otherwise
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
	try {
		return isValidPhoneNumber(phoneNumber);
	} catch (error) {
		return false;
	}
}

/**
 * Format phone number for display (user-friendly format)
 * @param phoneNumber - Phone number in E.164 format
 * @returns Formatted phone number (e.g., +886 912 345 678)
 */
export function formatPhoneNumber(phoneNumber: string): string {
	try {
		const parsed = parsePhoneNumber(phoneNumber);
		return parsed.formatInternational(); // Returns +886 912 345 678
	} catch (error) {
		return phoneNumber;
	}
}

/**
 * Mask phone number for privacy (e.g., +886****5678)
 * @param phoneNumber - Phone number in E.164 format
 * @returns Masked phone number
 */
export function maskPhoneNumber(phoneNumber: string): string {
	if (phoneNumber.length <= 4) return "****";
	return phoneNumber.slice(0, -4) + "****";
}

/**
 * Check if a phone number is valid for SMS notifications (E.164 format)
 * This is a more restrictive check that only allows supported country codes.
 * Valid formats:
 * - +886912345678 (Taiwan)
 * - +14155551212 (US/Canada)
 * - Must start with + and country code
 * @param phoneNumber - Phone number to validate
 * @returns true if valid for SMS notifications, false otherwise
 */
export function isValidPhoneNumberForSms(
	phoneNumber: string | null | undefined,
): boolean {
	if (!phoneNumber) {
		return false;
	}

	const normalized = phoneNumber.trim();

	// E.164 format: starts with +, followed by country code and number
	// Minimum length: +1 + 10 digits = 12 characters (US/Canada)
	// Maximum length: +886 + 9 digits = 13 characters (Taiwan)
	const e164Regex = /^\+[1-9]\d{1,14}$/;

	if (!e164Regex.test(normalized)) {
		return false;
	}

	// Check for supported country codes (Taiwan +886, US/Canada +1)
	const isTaiwanNumber = /^\+886/.test(normalized);
	const isUSNumber = /^\+1/.test(normalized);

	// Currently only support Taiwan and US/Canada numbers for SMS
	return isTaiwanNumber || isUSNumber;
}
