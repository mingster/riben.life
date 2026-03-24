export interface BusinessHourRange {
	from: string;
	to: string;
}

export const WEEKDAY_NAMES = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
] as const;

export type WeekdayName = (typeof WEEKDAY_NAMES)[number];

export type BusinessHoursDayValue = BusinessHourRange[] | "closed";

export interface BusinessHoursJsonShape {
	Monday: BusinessHoursDayValue;
	Tuesday: BusinessHoursDayValue;
	Wednesday: BusinessHoursDayValue;
	Thursday: BusinessHoursDayValue;
	Friday: BusinessHoursDayValue;
	Saturday: BusinessHoursDayValue;
	Sunday: BusinessHoursDayValue;
	holidays: string[];
	timeZone: string;
}

export interface BusinessHoursFormDay {
	day: WeekdayName;
	isClosed: boolean;
	ranges: BusinessHourRange[];
}

export interface BusinessHoursFormModel {
	timeZone: string;
	holidays: string[];
	days: BusinessHoursFormDay[];
}

export const DEFAULT_TIMEZONE = "Asia/Taipei";

export const DEFAULT_RANGE: BusinessHourRange = {
	from: "09:00",
	to: "18:00",
};

export const DEFAULT_BUSINESS_HOURS_JSON: BusinessHoursJsonShape = {
	Monday: [{ ...DEFAULT_RANGE }],
	Tuesday: [{ ...DEFAULT_RANGE }],
	Wednesday: [{ ...DEFAULT_RANGE }],
	Thursday: [{ ...DEFAULT_RANGE }],
	Friday: [{ ...DEFAULT_RANGE }],
	Saturday: "closed",
	Sunday: "closed",
	holidays: [],
	timeZone: DEFAULT_TIMEZONE,
};

function isValidTimeValue(value: string): boolean {
	return /^\d{2}:\d{2}$/.test(value);
}

function toMinutes(value: string): number {
	const [hours, minutes] = value.split(":").map(Number);
	return hours * 60 + minutes;
}

function normalizeRanges(input: unknown): BusinessHourRange[] {
	if (!Array.isArray(input)) {
		return [];
	}

	return input
		.map((item) => {
			const from = String((item as { from?: string })?.from ?? "");
			const to = String((item as { to?: string })?.to ?? "");
			return { from, to };
		})
		.filter((item) => isValidTimeValue(item.from) && isValidTimeValue(item.to))
		.sort((a, b) => toMinutes(a.from) - toMinutes(b.from));
}

export function buildDefaultBusinessHoursFormModel(
	defaultTimezone?: string,
): BusinessHoursFormModel {
	const timezone = defaultTimezone || DEFAULT_TIMEZONE;

	return {
		timeZone: timezone,
		holidays: [],
		days: WEEKDAY_NAMES.map((day) => ({
			day,
			isClosed: day === "Saturday" || day === "Sunday",
			ranges:
				day === "Saturday" || day === "Sunday" ? [] : [{ ...DEFAULT_RANGE }],
		})),
	};
}

export function parseBusinessHoursJsonToFormModel(
	value: string | null | undefined,
	defaultTimezone?: string,
): BusinessHoursFormModel {
	if (!value || value.trim().length === 0) {
		return buildDefaultBusinessHoursFormModel(defaultTimezone);
	}

	const parsed = JSON.parse(value) as Partial<BusinessHoursJsonShape>;

	return {
		timeZone:
			typeof parsed.timeZone === "string" && parsed.timeZone.trim().length > 0
				? parsed.timeZone
				: defaultTimezone || DEFAULT_TIMEZONE,
		holidays: Array.isArray(parsed.holidays)
			? parsed.holidays.map((h) => String(h)).filter((h) => h.length > 0)
			: [],
		days: WEEKDAY_NAMES.map((weekday) => {
			const dayValue = parsed[weekday];
			if (dayValue === "closed") {
				return { day: weekday as WeekdayName, isClosed: true, ranges: [] };
			}
			const ranges = normalizeRanges(dayValue);
			return {
				day: weekday as WeekdayName,
				isClosed: ranges.length === 0,
				ranges: ranges.length > 0 ? ranges : [{ ...DEFAULT_RANGE }],
			};
		}),
	};
}

export function serializeBusinessHoursFormModel(
	model: BusinessHoursFormModel,
): string {
	const jsonShape: BusinessHoursJsonShape = {
		Monday: "closed",
		Tuesday: "closed",
		Wednesday: "closed",
		Thursday: "closed",
		Friday: "closed",
		Saturday: "closed",
		Sunday: "closed",
		holidays: model.holidays,
		timeZone: model.timeZone || DEFAULT_TIMEZONE,
	};

	for (const dayConfig of model.days) {
		const normalizedRanges = dayConfig.ranges
			.filter(
				(range) => isValidTimeValue(range.from) && isValidTimeValue(range.to),
			)
			.sort((a, b) => toMinutes(a.from) - toMinutes(b.from));

		jsonShape[dayConfig.day as WeekdayName] =
			dayConfig.isClosed || normalizedRanges.length === 0
				? "closed"
				: normalizedRanges;
	}

	return JSON.stringify(jsonShape, null, 2);
}

export function validateBusinessHoursFormModel(
	model: BusinessHoursFormModel,
): string[] {
	const errors: string[] = [];

	if (!model.timeZone || model.timeZone.trim().length === 0) {
		errors.push("Timezone is required.");
	}

	for (const day of model.days) {
		if (day.isClosed) {
			continue;
		}

		if (day.ranges.length === 0) {
			errors.push(`${day.day}: at least one time range is required.`);
			continue;
		}

		let previousToMinutes = -1;
		for (const range of day.ranges) {
			if (!isValidTimeValue(range.from) || !isValidTimeValue(range.to)) {
				errors.push(`${day.day}: invalid time format. Use HH:mm.`);
				continue;
			}

			const fromMinutes = toMinutes(range.from);
			const toMinutesValue = toMinutes(range.to);
			if (fromMinutes >= toMinutesValue) {
				errors.push(`${day.day}: start time must be before end time.`);
			}

			if (previousToMinutes > fromMinutes) {
				errors.push(`${day.day}: time ranges must not overlap.`);
			}

			previousToMinutes = toMinutesValue;
		}
	}

	return errors;
}
