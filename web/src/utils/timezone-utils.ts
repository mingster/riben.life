/**
 * Timezone Utility Functions
 * Helper functions for detecting and working with timezones
 */

export interface TimezoneInfo {
	timezone: string;
	offset: number; // offset in minutes
	offsetHours: number;
	tzEnvVar: string | undefined;
	currentTime: Date;
	currentTimeString: string;
	isUTC: boolean;
	isTaipei: boolean;
}

/**
 * Get comprehensive timezone information for the current server
 */
export function getServerTimezoneInfo(): TimezoneInfo {
	const now = new Date();
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const offset = now.getTimezoneOffset(); // negative = ahead of UTC
	const offsetHours = -offset / 60; // convert to positive hours ahead

	return {
		timezone,
		offset,
		offsetHours,
		tzEnvVar: process.env.TZ,
		currentTime: now,
		currentTimeString: now.toString(),
		isUTC: offset === 0,
		isTaipei: timezone === "Asia/Taipei" || offsetHours === 8,
	};
}

/**
 * Log timezone information to console
 */
export function logTimezoneInfo(): void {
	const info = getServerTimezoneInfo();
	console.log("=== Server Timezone Information ===");
	console.log(`Timezone: ${info.timezone}`);
	console.log(
		`Offset: ${info.offset} minutes (${info.offsetHours > 0 ? "+" : ""}${info.offsetHours} hours)`,
	);
	console.log(`TZ Environment Variable: ${info.tzEnvVar || "not set"}`);
	console.log(`Current Time: ${info.currentTimeString}`);
	console.log(`Is UTC: ${info.isUTC}`);
	console.log(`Is Taipei (GMT+8): ${info.isTaipei}`);
	console.log("===================================");
}

/**
 * Format a date showing both UTC and local time
 */
export function formatDateBothTimezones(date: Date): string {
	const utcString = date.toISOString();
	const localString = date.toString();
	return `UTC: ${utcString} | Local: ${localString}`;
}

/**
 * Check if server timezone matches expected timezone
 */
export function verifyServerTimezone(
	expectedTimezone: string = "Asia/Taipei",
): boolean {
	const info = getServerTimezoneInfo();
	return info.timezone === expectedTimezone;
}

/**
 * Create a Date object from Taipei timezone components
 * This function is timezone-independent - it works regardless of server timezone
 * Stores Taipei time AS UTC timestamp to preserve the display time
 *
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12, NOT 0-indexed)
 * @param day - Day of month (1-31)
 * @param hour - Hour (0-23)
 * @param minute - Minute (0-59)
 * @param second - Second (0-59, default: 0)
 * @param millisecond - Millisecond (0-999, default: 0)
 * @returns Date object with Taipei time stored as UTC timestamp (display time preserved)
 * @example
 * // Input: 2025-10-23 00:40 (Taipei time)
 * const date = createDateFromTaipeiTime(2025, 10, 23, 0, 40, 0, 0);
 * // Result: 2025-10-23T00:40:00.000Z (Taipei time preserved in UTC timestamp)
 */
export function createDateFromTaipeiTime(
	year: number,
	month: number,
	day: number,
	hour: number = 0,
	minute: number = 0,
	second: number = 0,
	millisecond: number = 0,
): Date {
	// Store Taipei time AS UTC to preserve the display time
	// This way "2025-10-23 00:40" Taipei is stored as "2025-10-23T00:40:00.000Z"
	// The database timestamp preserves the Taipei display time
	// This is timezone-independent because it uses Date.UTC() which works the same everywhere
	return new Date(
		Date.UTC(year, month - 1, day, hour, minute, second, millisecond),
	);
}

/**
 * Parse a date string in YYYY-MM-DD format from Taipei timezone
 *
 * @param dateString - Date string in format "YYYY-MM-DD" or "YYYY/MM/DD"
 * @returns Date object with Taipei midnight stored as UTC timestamp, or null if invalid
 * @example
 * const date = parseTaipeiDateString("2025-10-23");
 * // Result: 2025-10-23T00:00:00.000Z (Taipei midnight preserved as UTC)
 */
export function parseTaipeiDateString(dateString: string): Date | null {
	try {
		// Normalize the date string (replace / with -)
		const normalized = dateString.replace(/\//g, "-");
		const [year, month, day] = normalized.split("-").map(Number);

		if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
			return null;
		}

		if (
			year < 1900 ||
			year > 2100 ||
			month < 1 ||
			month > 12 ||
			day < 1 ||
			day > 31
		) {
			return null;
		}

		return createDateFromTaipeiTime(year, month, day, 0, 0, 0, 0);
	} catch (error) {
		return null;
	}
}

/**
 * Parse a time string (HH:MM) and combine with a Taipei date
 *
 * @param timeString - Time string in format "HH:MM"
 * @param baseDate - Base date (Taipei date stored as UTC timestamp)
 * @returns Date object with Taipei time stored as UTC timestamp, or null if invalid
 * @example
 * const baseDate = parseTaipeiDateString("2025-10-23");
 * const time = parseTaipeiTimeString("14:30", baseDate);
 * // Result: 2025-10-23T14:30:00.000Z (Taipei 14:30 preserved as UTC)
 */
export function parseTaipeiTimeString(
	timeString: string,
	baseDate: Date,
): Date | null {
	try {
		const timeMatch = timeString.match(/^(\d{1,2}):(\d{2})$/);
		if (!timeMatch) {
			return null;
		}

		const hour = parseInt(timeMatch[1], 10);
		const minute = parseInt(timeMatch[2], 10);

		if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
			return null;
		}

		// baseDate already has the Taipei date stored as UTC timestamp
		// Just update the time component using UTC methods
		const result = new Date(baseDate);
		result.setUTCHours(hour, minute, 0, 0);

		return result;
	} catch (error) {
		return null;
	}
}
