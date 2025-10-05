/**
 * Utility functions for GUID handling and validation
 */

/**
 * Converts a GUID string to proper format with hyphens
 * @param guid - The GUID string (with or without hyphens)
 * @returns The properly formatted GUID string
 */
export function formatGuid(guid: string): string {
	if (!guid || typeof guid !== "string") {
		throw new Error("Invalid GUID: must be a non-empty string");
	}

	// Remove any existing hyphens and whitespace
	const cleanGuid = guid.replace(/[-\s]/g, "");

	// Check if it's a valid 32-character hex string
	if (cleanGuid.length !== 32) {
		throw new Error(
			`Invalid GUID length: expected 32 characters, got ${cleanGuid.length}`,
		);
	}

	// Validate hex characters
	const hexRegex = /^[0-9a-f]+$/i;
	if (!hexRegex.test(cleanGuid)) {
		throw new Error("Invalid GUID: contains non-hexadecimal characters");
	}

	// Format with hyphens: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
	return [
		cleanGuid.substring(0, 8),
		cleanGuid.substring(8, 12),
		cleanGuid.substring(12, 16),
		cleanGuid.substring(16, 20),
		cleanGuid.substring(20, 32),
	].join("-");
}

/**
 * Validates if a string is a properly formatted GUID
 * @param guid - The GUID string to validate
 * @returns True if the GUID is valid, false otherwise
 */
export function isValidGuid(guid: string): boolean {
	if (!guid || typeof guid !== "string") {
		return false;
	}

	// Check for standard GUID format with hyphens
	const guidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	return guidRegex.test(guid);
}

/**
 * Safely converts a GUID string to proper format, handling various input formats
 * @param guid - The GUID string (can be with or without hyphens)
 * @returns The properly formatted GUID string, or null if invalid
 */
export function safeFormatGuid(guid: string | null | undefined): string | null {
	if (!guid || typeof guid !== "string") {
		return null;
	}

	try {
		return formatGuid(guid);
	} catch {
		return null;
	}
}

/**
 * Converts a GUID string to format without hyphens (32 characters)
 * @param guid - The GUID string (with or without hyphens)
 * @returns The GUID string without hyphens
 */
export function guidWithoutHyphens(guid: string): string {
	if (!guid || typeof guid !== "string") {
		throw new Error("Invalid GUID: must be a non-empty string");
	}

	// Remove hyphens and return
	return guid.replace(/[-\s]/g, "");
}
