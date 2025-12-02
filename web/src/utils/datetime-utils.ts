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

	// if dt is not Date object, return empty string
	if (typeof dt !== "object") return dt;

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
 * Get user's current time from UTC based on their timezone
 * @param timezone - User's timezone (e.g., 'Asia/Taipei', 'America/New_York')
 * @returns Date object representing current time in user's timezone
 */
export function getUserCurrentTimeFromUtc(timezone: string): Date {
	try {
		const now = new Date();

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

		// Parse the timezone-adjusted time string back to a Date object
		// Format: YYYY-MM-DD, HH:MM:SS
		const [datePart, timePart] = userTimeString.split(", ");
		const [year, month, day] = datePart.split("-");
		const [hour, minute, second] = timePart.split(":");

		const result = new Date(
			parseInt(year),
			parseInt(month) - 1, // JavaScript months are 0-based
			parseInt(day),
			parseInt(hour),
			parseInt(minute),
			parseInt(second),
		);

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
