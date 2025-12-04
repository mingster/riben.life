import { format } from "date-fns";
import logger from "@/lib/logger";

// https://nextjs.org/learn-pages-router/basics/dynamic-routes/polishing-post-page
// https://github.com/you-dont-need/You-Dont-Need-Momentjs?tab=readme-ov-file#string--time-format
export const formatDateTime = (d: Date | undefined) => {
	if (d === undefined) return "";

	return format(d, "yyyy-MM-dd HH:mm");
};
export const formatDateTimeFull = (d: Date | undefined) => {
	if (d === undefined) return "";

	return format(d, "yyyy-MM-dd HH:mm zzz");
};

export function getNowTimeInTz(offsetHours: number) {
	//throw error if offsetHours is not a number
	if (typeof offsetHours !== "number") {
		throw new Error("offsetHours must be a number");
	}

	return getDateInTz(getUtcNow(), offsetHours);
}

export function getDateInTz(dt: Date, offsetHours: number): Date {
	//throw error if offsetHours is not a number
	if (typeof offsetHours !== "number") {
		throw new Error("offsetHours must be a number");
	}

	// if dt is not Date object, return it as-is (caller should handle validation)
	if (typeof dt !== "object" || !(dt instanceof Date)) {
		return dt;
	}

	// Validate date is not invalid
	if (Number.isNaN(dt.getTime())) {
		return dt; // Return invalid date as-is, caller should handle
	}

	// Use UTC getters since we store dates as UTC components
	const result = new Date(
		Date.UTC(
			dt.getUTCFullYear(),
			dt.getUTCMonth(),
			dt.getUTCDate(),
			dt.getUTCHours(),
			dt.getUTCMinutes(),
			dt.getUTCSeconds(),
			offsetHours * 60,
		),
	);

	//console.log('dt', dt, result);

	return result;
}

export function getOffsetHours(timezone: string): number {
	try {
		// Create a date object for January 1st to avoid DST issues
		const date = new Date(2024, 0, 1);

		// Get the time in UTC
		const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;

		// Get the time in the target timezone
		const targetTimeString = date.toLocaleString("en-US", {
			timeZone: timezone,
		});
		const targetTime = new Date(targetTimeString);

		// Calculate the offset in hours
		const offsetMs = targetTime.getTime() - utcTime;
		const offsetHours = offsetMs / (1000 * 60 * 60);

		return offsetHours;
	} catch (error) {
		logger.warn(error, {
			message: "Invalid timezone",
			metadata: { timezone },
			service: "getOffsetHours",
			environment: process.env.NODE_ENV,
			version: process.env.npm_package_version,
			tags: ["timezone", "warn"],
		});
		return 0; // Return UTC offset as fallback
	}
}

/**
 * Get timezone offset in hours for a specific date/time in a given timezone
 * @param date - Date object (will be used to get UTC components)
 * @param timezone - Timezone string (e.g., "Asia/Taipei")
 * @returns Offset in hours (positive means timezone is ahead of UTC)
 */
export function getTimezoneOffsetForDate(date: Date, timezone: string): number {
	// Validate input date
	if (!date || isNaN(date.getTime())) {
		logger.warn("Invalid date provided to getTimezoneOffsetForDate", {
			metadata: { timezone, date },
			tags: ["datetime", "timezone", "warn"],
		});
		const fallback = getOffsetHours(timezone);
		return isNaN(fallback) || !Number.isFinite(fallback) ? 0 : fallback;
	}

	try {
		// Use a simpler, more reliable method: compare what the same UTC moment looks like in different timezones
		// Create formatters for both UTC and target timezone
		const tzFormatter = new Intl.DateTimeFormat("en", {
			timeZone: timezone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		});

		const utcFormatter = new Intl.DateTimeFormat("en", {
			timeZone: "UTC",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		});

		// Format the same date in both timezones
		const tzParts = tzFormatter.formatToParts(date);
		const utcParts = utcFormatter.formatToParts(date);

		// Extract values from parts
		const getValue = (
			parts: Intl.DateTimeFormatPart[],
			type: string,
		): number => {
			const part = parts.find((p) => p.type === type);
			if (!part) {
				return NaN;
			}
			const value = Number.parseInt(part.value, 10);
			return isNaN(value) ? NaN : value;
		};

		const tzYear = getValue(tzParts, "year");
		const tzMonth = getValue(tzParts, "month");
		const tzDay = getValue(tzParts, "day");
		const tzHour = getValue(tzParts, "hour");
		const tzMinute = getValue(tzParts, "minute");

		const utcYear = getValue(utcParts, "year");
		const utcMonth = getValue(utcParts, "month");
		const utcDay = getValue(utcParts, "day");
		const utcHour = getValue(utcParts, "hour");
		const utcMinute = getValue(utcParts, "minute");

		// Validate all parts were found and are valid numbers
		if (
			isNaN(tzYear) ||
			isNaN(tzMonth) ||
			isNaN(tzDay) ||
			isNaN(tzHour) ||
			isNaN(tzMinute) ||
			isNaN(utcYear) ||
			isNaN(utcMonth) ||
			isNaN(utcDay) ||
			isNaN(utcHour) ||
			isNaN(utcMinute)
		) {
			logger.warn("Failed to extract timezone parts", {
				metadata: {
					timezone,
					tzParts: JSON.stringify(tzParts),
					utcParts: JSON.stringify(utcParts),
					date: date.toISOString(),
				},
				tags: ["datetime", "timezone", "warn"],
			});
			const fallback = getOffsetHours(timezone);
			return isNaN(fallback) || !Number.isFinite(fallback) ? 0 : fallback;
		}

		// Calculate offset in minutes
		const tzMinutes = tzHour * 60 + tzMinute;
		const utcMinutes = utcHour * 60 + utcMinute;
		let offsetMinutes = tzMinutes - utcMinutes;

		// Handle day differences
		if (tzYear !== utcYear || tzMonth !== utcMonth || tzDay !== utcDay) {
			// Calculate day difference
			const dayDiff = tzDay - utcDay;
			// Also account for month/year differences
			if (tzYear !== utcYear || tzMonth !== utcMonth) {
				// More complex calculation needed for month/year differences
				// Use UTC for both to ensure timezone-independent calculation
				// We're comparing the formatted date components, so we need to create
				// UTC dates representing midnight in each timezone's date
				const tzDate = new Date(Date.UTC(tzYear, tzMonth - 1, tzDay));
				const utcDate = new Date(Date.UTC(utcYear, utcMonth - 1, utcDay));
				const dayDiffMs = tzDate.getTime() - utcDate.getTime();
				const dayDiffCalculated = Math.round(dayDiffMs / (1000 * 60 * 60 * 24));
				offsetMinutes += dayDiffCalculated * 24 * 60;
			} else {
				offsetMinutes += dayDiff * 24 * 60;
			}
		}

		const result = offsetMinutes / 60;

		// Validate result is not NaN or infinite
		if (isNaN(result) || !Number.isFinite(result)) {
			logger.warn("Calculated offset is NaN or infinite", {
				metadata: {
					timezone,
					offsetMinutes,
					tzHour,
					utcHour,
					tzDay,
					utcDay,
					tzYear,
					utcYear,
					result,
				},
				tags: ["datetime", "timezone", "warn"],
			});
			const fallback = getOffsetHours(timezone);
			return isNaN(fallback) || !Number.isFinite(fallback) ? 0 : fallback;
		}

		return result;
	} catch (error) {
		logger.warn("Failed to get timezone offset for date", {
			metadata: {
				timezone,
				error: error instanceof Error ? error.message : String(error),
				date: date.toISOString(),
			},
			tags: ["datetime", "timezone", "warn"],
		});
		const fallback = getOffsetHours(timezone);
		// Ensure fallback is not NaN
		return isNaN(fallback) || !Number.isFinite(fallback) ? 0 : fallback;
	}
}

/**
 * Format a UTC Date to datetime-local string in a specific timezone
 * @param date - UTC Date object to format
 * @param timezone - Target timezone (e.g., "Asia/Taipei")
 * @returns String in format "YYYY-MM-DDTHH:mm" representing the date/time in the target timezone
 */
export function formatUtcDateToDateTimeLocal(
	date: Date,
	timezone: string,
): string {
	try {
		// Validate input date
		if (!date || isNaN(date.getTime())) {
			logger.warn("Invalid date provided to formatUtcDateToDateTimeLocal", {
				metadata: { timezone, date },
				tags: ["datetime", "timezone", "warn"],
			});
			return "";
		}

		// Use Intl.DateTimeFormat to format the UTC date in the target timezone
		const formatter = new Intl.DateTimeFormat("en-CA", {
			timeZone: timezone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});

		// Format the date
		const parts = formatter.formatToParts(date);
		const getValue = (type: string): string => {
			const part = parts.find((p) => p.type === type);
			return part ? part.value : "";
		};

		const year = getValue("year");
		const month = getValue("month");
		const day = getValue("day");
		const hour = getValue("hour");
		const minute = getValue("minute");

		// Return in datetime-local format: YYYY-MM-DDTHH:mm
		return `${year}-${month}-${day}T${hour}:${minute}`;
	} catch (error) {
		logger.warn("Failed to format UTC date to datetime-local", {
			metadata: {
				timezone,
				error: error instanceof Error ? error.message : String(error),
				date: date.toISOString(),
			},
			tags: ["datetime", "timezone", "warn"],
		});
		return "";
	}
}

/**
 * Convert a Date (day) and time slot string to UTC Date
 * This is a convenience function that combines day + timeSlot into a datetime-local string
 * and converts it to UTC using the store's timezone.
 * @param day - Date object representing a day (components will be extracted as-is)
 * @param timeSlot - Time string in format "HH:mm" (e.g., "10:00")
 * @param storeTimezone - Store's timezone (e.g., "Asia/Taipei")
 * @returns Date object in UTC
 */
export function dayAndTimeSlotToUtc(
	day: Date,
	timeSlot: string,
	storeTimezone: string,
): Date {
	const [hours, minutes] = timeSlot.split(":").map(Number);

	// Extract date components from day
	const year = day.getFullYear();
	const month = String(day.getMonth() + 1).padStart(2, "0");
	const dayOfMonth = String(day.getDate()).padStart(2, "0");
	const hourStr = String(hours).padStart(2, "0");
	const minuteStr = String(minutes).padStart(2, "0");

	// Create datetime-local string (interpreted as store timezone)
	const datetimeLocalString = `${year}-${month}-${dayOfMonth}T${hourStr}:${minuteStr}`;

	// Convert store timezone datetime to UTC Date
	return convertToUtc(datetimeLocalString, storeTimezone);
}

/**
 * Convert a Date object (from datetime-local input) to UTC Date
 * The Date object from datetime-local input represents a time in the browser's local timezone.
 * This function interprets it as store timezone time and converts to UTC.
 * @param dateInput - Date object from datetime-local input
 * @param storeTimezone - Store's timezone (e.g., "Asia/Taipei")
 * @returns Date object in UTC
 * @throws Error if date is invalid or conversion fails
 */
export function convertDateToUtc(dateInput: Date, storeTimezone: string): Date {
	// Validate input is a Date object
	if (!(dateInput instanceof Date)) {
		throw new Error(
			`Invalid date format: expected Date, got ${typeof dateInput}`,
		);
	}

	// Validate the date is valid
	if (isNaN(dateInput.getTime())) {
		throw new Error("Invalid date provided");
	}

	// Convert the Date to a datetime-local string format (YYYY-MM-DDTHH:mm)
	// This extracts the local time components that the user selected
	const year = dateInput.getFullYear();
	const month = String(dateInput.getMonth() + 1).padStart(2, "0");
	const day = String(dateInput.getDate()).padStart(2, "0");
	const hour = String(dateInput.getHours()).padStart(2, "0");
	const minute = String(dateInput.getMinutes()).padStart(2, "0");
	const datetimeLocalString = `${year}-${month}-${day}T${hour}:${minute}`;

	// Use convertToUtc to interpret this as store timezone and convert to UTC
	const utcDate = convertToUtc(datetimeLocalString, storeTimezone);

	// Validate the converted date is valid
	if (isNaN(utcDate.getTime())) {
		throw new Error("Failed to convert date to UTC");
	}

	return utcDate;
}

/**
 * Convert a datetime-local string (interpreted as store timezone) to UTC Date
 * @param datetimeLocalString - String in format "YYYY-MM-DDTHH:mm" from datetime-local input
 * @param localTimezone - local timezone (e.g., "Asia/Taipei")
 * @returns Date object in UTC
 */
export function convertToUtc(
	datetimeLocalString: string,
	localTimezone: string,
): Date {
	try {
		// Parse the datetime-local string (format: "YYYY-MM-DDTHH:mm")
		const [datePart, timePart] = datetimeLocalString.split("T");
		if (!datePart) {
			throw new Error("Invalid datetime format");
		}
		const [year, month, day] = datePart.split("-").map(Number);
		const [hour, minute] = (timePart || "00:00").split(":").map(Number);

		// Create a UTC date representing noon on the selected day
		// This will be used to calculate the timezone offset for this specific date
		const testUtcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

		// Get the store timezone offset for this specific date (accounts for DST)
		const offsetHours = getTimezoneOffsetForDate(testUtcDate, localTimezone);

		// Create a UTC Date representing the local timezone time
		// We treat the input (year, month, day, hour, minute) as if it were UTC
		// Then subtract the timezone offset to get the actual UTC time
		// Example: 10:00 in Asia/Taipei (UTC+8) = 10:00 UTC - 8 hours = 02:00 UTC
		const localTimeAsUtc = new Date(
			Date.UTC(year, month - 1, day, hour, minute, 0, 0),
		);

		// Convert store timezone time to UTC by subtracting the offset
		// If store time is 10:00 and offset is +8, UTC is 02:00 (10 - 8 = 2)
		const utcTime = addHours(localTimeAsUtc, -offsetHours);

		// Create a proper UTC Date object using UTC components
		// This ensures the date is stored as UTC in the database
		const utcDateAsUTC = new Date(
			Date.UTC(
				utcTime.getUTCFullYear(),
				utcTime.getUTCMonth(),
				utcTime.getUTCDate(),
				utcTime.getUTCHours(),
				utcTime.getUTCMinutes(),
				0,
				0,
			),
		);

		return utcDateAsUTC;
	} catch (error) {
		logger.warn("Failed to convert local timezone to UTC", {
			metadata: {
				datetimeLocalString,
				localTimezone: localTimezone,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["datetime", "timezone", "warn"],
		});
		// Fallback: treat as UTC
		const [datePart, timePart] = datetimeLocalString.split("T");
		const [year, month, day] = datePart.split("-").map(Number);
		const [hour, minute] = (timePart || "00:00").split(":").map(Number);
		return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
	}
}

/**
 * Get timezone offset in minutes
 */
export function getTimezoneOffset(timezone: string): number {
	try {
		const now = new Date();
		const utc = now.getTime() + now.getTimezoneOffset() * 60000;
		const targetTime = new Date(utc + 0 * 60000); // Adjust this based on your timezone logic
		return targetTime.getTimezoneOffset();
	} catch (error) {
		logger.warn("Failed to calculate timezone offset", {
			message: "Failed to calculate timezone offset",
			metadata: {
				timezone,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["epg", "timezone"],
		});
		return 0;
	}
}

export function getUtcNow() {
	const d = new Date();
	// Use Date.UTC() to ensure server-independent UTC time
	// This was previously using local timezone constructor which is server-dependent!
	const utcDate = new Date(
		Date.UTC(
			d.getUTCFullYear(),
			d.getUTCMonth(),
			d.getUTCDate(),
			d.getUTCHours(),
			d.getUTCMinutes(),
			d.getUTCSeconds(),
			d.getUTCMilliseconds(),
		),
	);

	//console.log('utcDate', utcDate);
	return utcDate;
}

/**
 * Get current UTC time as BigInt (epoch milliseconds)
 * @returns BigInt representing milliseconds since 1970-01-01 UTC
 */
export function getUtcNowEpoch(): bigint {
	return BigInt(Date.now());
}

/**
 * Convert Date to BigInt (epoch milliseconds)
 * @param date - Date object to convert
 * @returns BigInt representing milliseconds since 1970-01-01 UTC
 */
export function dateToEpoch(date: Date | null | undefined): bigint | null {
	if (!date) return null;
	return BigInt(date.getTime());
}

/**
 * Convert BigInt (epoch milliseconds) to Date
 * Always returns a UTC Date object (epoch timestamps are UTC by definition)
 * @param epoch - BigInt representing milliseconds since 1970-01-01 UTC
 * @returns Date object in UTC, or null if epoch is null/undefined
 */
export function epochToDate(epoch: bigint | null | undefined): Date | null {
	if (epoch === null || epoch === undefined) return null;

	// Create Date from UTC epoch timestamp
	// The timestamp is already UTC, so new Date() creates a UTC Date
	// We explicitly ensure it's treated as UTC by using the timestamp directly
	const timestamp = Number(epoch);
	const utcDate = new Date(timestamp);

	// Validate the date is valid
	if (isNaN(utcDate.getTime())) {
		return null;
	}

	// Return the UTC Date (JavaScript Date objects are always stored as UTC internally)
	return utcDate;
}

/**
 * Convert BigInt (epoch milliseconds) to Date, with fallback to current time
 * Always returns a UTC Date object (epoch timestamps are UTC by definition)
 * @param epoch - BigInt representing milliseconds since 1970-01-01 UTC
 * @returns Date object in UTC, or current UTC time if epoch is null/undefined
 */
export function epochToDateOrNow(epoch: bigint | null | undefined): Date {
	if (epoch === null || epoch === undefined) return getUtcNow();

	// Create Date from UTC epoch timestamp
	// The timestamp is already UTC, so new Date() creates a UTC Date
	// We explicitly ensure it's treated as UTC by using the timestamp directly
	const timestamp = Number(epoch);
	const utcDate = new Date(timestamp);

	// Validate the date is valid
	if (isNaN(utcDate.getTime())) {
		// If invalid, fallback to current UTC time
		return getUtcNow();
	}

	// Return the UTC Date (JavaScript Date objects are always stored as UTC internally)
	return utcDate;
}

/**
 * Get user's current time from UTC based on their timezone
 * @param timezone - User's timezone (e.g., 'Asia/Taipei', 'America/New_York')
 * @returns Date object representing current time in user's timezone
 *
 * This function returns a Date object that, when formatted in the target timezone,
 * will show the current time in that timezone. The Date object is stored as UTC internally.
 */
export function getUserCurrentTimeFromUtc(timezone: string): Date {
	try {
		const now = getUtcNow();

		// Get the current time in the user's timezone
		const userTimeString = now.toLocaleString("en-CA", {
			timeZone: timezone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		});

		// Parse the timezone-adjusted time string
		// Format: YYYY-MM-DD, HH:MM:SS
		const [datePart, timePart] = userTimeString.split(", ");
		const [year, month, day] = datePart.split("-");
		const [hour, minute, second] = timePart.split(":");

		// Validate parsed values
		const yearNum = parseInt(year, 10);
		const monthNum = parseInt(month, 10);
		const dayNum = parseInt(day, 10);
		const hourNum = parseInt(hour, 10);
		const minuteNum = parseInt(minute, 10);
		const secondNum = parseInt(second, 10);

		if (
			isNaN(yearNum) ||
			isNaN(monthNum) ||
			isNaN(dayNum) ||
			isNaN(hourNum) ||
			isNaN(minuteNum) ||
			isNaN(secondNum)
		) {
			logger.warn("Failed to parse timezone string", {
				metadata: {
					timezone,
					userTimeString,
				},
				tags: ["datetime", "timezone", "warn"],
			});
			return getUtcNow();
		}

		// Create a temporary Date from local time components as if they were UTC
		// This gives us a reference point
		const localTimeAsUtc = new Date(
			Date.UTC(
				yearNum,
				monthNum - 1, // JavaScript months are 0-based
				dayNum,
				hourNum,
				minuteNum,
				secondNum,
			),
		);

		// Get the timezone offset for this timezone at the current moment
		// The offset tells us how many hours ahead/behind UTC the timezone is
		const offsetHours = getTimezoneOffsetForDate(localTimeAsUtc, timezone);

		// Validate offset
		if (isNaN(offsetHours) || !Number.isFinite(offsetHours)) {
			logger.warn("Invalid timezone offset", {
				metadata: {
					timezone,
					offsetHours,
				},
				tags: ["datetime", "timezone", "warn"],
			});
			return getUtcNow();
		}

		// Convert local time to UTC by subtracting the offset
		// If timezone is UTC+8 and local time is 10:00 AM, UTC is 2:00 AM
		// So: UTC = localTime - offset
		const utcTimestamp =
			localTimeAsUtc.getTime() - offsetHours * 60 * 60 * 1000;

		// Create the final Date object representing the current time in the target timezone
		const result = new Date(utcTimestamp);

		// Validate the result
		if (isNaN(result.getTime())) {
			logger.warn("Invalid Date created", {
				metadata: {
					timezone,
					utcTimestamp,
					offsetHours,
				},
				tags: ["datetime", "timezone", "warn"],
			});
			return getUtcNow();
		}

		return result;
	} catch (error) {
		logger.warn("Failed to get user current time from UTC", {
			message: "Failed to get user current time from UTC",
			metadata: {
				timezone,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["datetime", "timezone", "warn"],
		});

		// Fallback to UTC time if timezone conversion fails
		return getUtcNow();
	}
}

export const calculateTrialEndUnixTimestamp = (
	trialPeriodDays: number | null | undefined,
) => {
	// Check if trialPeriodDays is null, undefined, or less than 2 days
	if (
		trialPeriodDays === null ||
		trialPeriodDays === undefined ||
		trialPeriodDays < 2
	) {
		return undefined;
	}

	const currentDate = new Date(); // Current date and time
	const trialEnd = new Date(
		currentDate.getTime() + (trialPeriodDays + 1) * 24 * 60 * 60 * 1000,
	); // Add trial days

	return Math.floor(trialEnd.getTime() / 1000); // Convert to Unix timestamp in seconds
};

export const toDateTime = (secs: number) => {
	const t = new Date(+0); // Unix epoch start.
	t.setSeconds(secs);

	return t;
};

/**
 * Returns the number of days from the given datetime.
 *
 * @param dt - The input Date object
 * @returns The number of days in the month of the given datetime
 */
export function getNumOfDaysInTheMonth(dt: Date): number {
	// Use UTC getters since we store dates as UTC components
	const day = dt.getUTCDate();
	let yr = dt.getUTCFullYear();
	let mo = dt.getUTCMonth() + 1; // JS months are 0-based, so +1 for 1-based

	// Get last day of this month using UTC
	const eom = new Date(Date.UTC(yr, mo - 1 + 1, 0)).getUTCDate(); // last day of this month

	if (day === eom) {
		mo = mo + 1;
		if (mo > 12) {
			mo = 1;
			yr = yr + 1;
		}
	}

	// JS Date: Date.UTC(year, month, 0) gives last day of previous month, so month is 1-based here
	return new Date(Date.UTC(yr, mo, 0)).getUTCDate();
}

export function getFirstDayOfWeek(d: Date): Date {
	// Use UTC getters since we store dates as UTC components
	const day = d.getUTCDay(); // 0 = Sunday, 6 = Saturday
	const diff = d.getUTCDate() - day; // Days to subtract to get to Sunday
	return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
}

export function addDays(dt: Date, days: number): Date {
	return new Date(dt.getTime() + days * 24 * 60 * 60 * 1000);
}

export function addHours(dt: Date, hours: number): Date {
	return new Date(dt.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Helper to format date using UTC components (not browser timezone)
 * This is needed because we store user's local time as UTC components
 * @param date - Date object to format
 * @param formatString - Format string with tokens: yyyy, MM, dd, HH, mm, ss, EEEE, EEE
 * @returns Formatted date string
 */
export const formatDateUTC = (date: Date, formatString: string): string => {
	// Extract UTC components
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	const day = String(date.getUTCDate()).padStart(2, "0");
	const hour = String(date.getUTCHours()).padStart(2, "0");
	const minute = String(date.getUTCMinutes()).padStart(2, "0");
	const second = String(date.getUTCSeconds()).padStart(2, "0");

	// Get weekday name (0 = Sunday, 6 = Saturday)
	const weekdayNames = [
		"Sunday",
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday",
	];
	const weekday = weekdayNames[date.getUTCDay()];
	const weekdayShort = weekday.substring(0, 3);

	// Replace format tokens
	return formatString
		.replace("yyyy", String(year))
		.replace("MM", month)
		.replace("dd", day)
		.replace("HH", hour)
		.replace("mm", minute)
		.replace("ss", second)
		.replace("EEEE", weekday)
		.replace("EEE", weekdayShort);
};
