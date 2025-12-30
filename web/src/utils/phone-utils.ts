import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";

/**
 * Normalize phone number to E.164 format
 * @param phoneNumber - Phone number in any format
 * @returns Normalized phone number in E.164 format (e.g., +886912345678)
 */
export function normalizePhoneNumber(phoneNumber: string): string {
	try {
		// Remove spaces, dashes, parentheses
		const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, "");

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
