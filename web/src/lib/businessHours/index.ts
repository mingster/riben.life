export const weekdays = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
];

interface TimeRange {
	from: string;
	to: string;
}
interface WeeklySchedule {
	Monday: TimeRange[] | "closed";
	Tuesday: TimeRange[] | "closed";
	Wednesday: TimeRange[] | "closed";
	Thursday: TimeRange[] | "closed";
	Friday: TimeRange[] | "closed";
	Saturday: TimeRange[] | "closed";
	Sunday: TimeRange[] | "closed";
	holidays: string[];
	timeZone: string;
}

export type BusinessHoursDay = {
	[day in keyof typeof weekdays]: TimeRange[] | "closed";
};

export type BusinessHoursData<_WeeklySchedule> = {
	[P in keyof typeof weekdays]: BusinessHoursDay;
} & {
	timeZone: string;
	holidays: string[];
};

// NOTE - this is a rewrite of https://github.com/stefanoTron/business-hours.js/blob/master/src/index.js
//
export default class BusinessHours {
	private _hours: Partial<WeeklySchedule> = {};
	//private _hours: BusinessHoursData = {};

	constructor(h: string | null) {
		if (!h) {
			throw new Error("no hours provided");
		}

		const data = JSON.parse(h) as WeeklySchedule;
		if (!data) {
			throw new Error("not valid JSON format");
		}

		this.init(data);

		//this.hours = data as BusinessHoursData;
		//console.log(JSON.stringify(this.hours));
	}

	//validate incoming data
	init(data: WeeklySchedule) {
		weekdays.forEach((day, _index) => {
			if (!(day in data)) {
				throw new Error(`${day} is missing from incoming data`);
			}

			const bizhours = (data as unknown as { [key: string]: BusinessHoursDay })[
				day
			];
			if (typeof bizhours === "string" && bizhours === "closed") {
				//console.log("day", day, bizhours);
			} else {
				const bizHourPair = bizhours[0] as object;
				if (!("from" in bizHourPair)) {
					const err = `${day} is missing 'from' in config`;
					console.error(err);
					throw new Error(err);
				}
				if (!("to" in bizHourPair)) {
					const err = `${day} is missing 'to' in config`;
					console.error(err);
					throw new Error(err);
				}

				// check the time value in bizHourPair
				if (Array.isArray(bizhours)) {
					for (let i = 0; i < Number(bizhours.length); i++) {
						//this should be a TimeRange like this: { from: "10:00", to: "13:30" }
						const bizHourPair = bizhours[i] as TimeRange;

						const f = bizHourPair.from;
						const t = bizHourPair.to;
						if (!this._isHourValid(f) || !this._isHourValid(t)) {
							const err = `${f} or ${t} is not valid`;
							console.error(err);
							throw new Error(err);
						}
					}
				}
			}
		});

		// finally, set the hours of this class instance
		this.hours = data;
	}

	private now(): Date {
		// Get current time in store's timezone
		// We need to get the date/time components in the store timezone
		const now = new Date();
		const formatter = new Intl.DateTimeFormat("en-US", {
			timeZone: this.hours.timeZone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		});

		const parts = formatter.formatToParts(now);
		const year = parseInt(parts.find((p) => p.type === "year")?.value || "0");
		const month =
			parseInt(parts.find((p) => p.type === "month")?.value || "0") - 1; // Month is 0-indexed
		const day = parseInt(parts.find((p) => p.type === "day")?.value || "0");
		const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
		const minute = parseInt(
			parts.find((p) => p.type === "minute")?.value || "0",
		);
		const second = parseInt(
			parts.find((p) => p.type === "second")?.value || "0",
		);

		// Create a date object with these components (will be in local timezone, but we'll use it for comparison)
		const date = new Date(year, month, day, hour, minute, second);

		/*
		console.log('[BusinessHours] now() - UTC time:', now.toISOString());
		console.log('[BusinessHours] now() - Store timezone:', this.hours.timeZone);
		console.log('[BusinessHours] now() - Store time components:', { year, month: month + 1, day, hour, minute, second });
		console.log('[BusinessHours] now() - Created date:', date.toISOString());
		*/

		return date;
	}

	// Getter method to return hours
	// of Student class
	public get hours() {
		return this._hours;
	}

	private isOpenOn(dateToCheck: Date): boolean {
		// Convert the date to store timezone (server independent)
		// Use Intl.DateTimeFormat to get all components in the store's timezone
		const dateFormatter = new Intl.DateTimeFormat("en-US", {
			timeZone: this.hours.timeZone,
			weekday: "long",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		});

		const dateParts = dateFormatter.formatToParts(dateToCheck);
		// Get weekday name and ensure it matches the weekdays array format (capitalized)
		const weekdayName =
			dateParts.find((p) => p.type === "weekday")?.value || "";
		const day =
			weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1).toLowerCase();
		const year = parseInt(
			dateParts.find((p) => p.type === "year")?.value || "0",
		);
		const month = parseInt(
			dateParts.find((p) => p.type === "month")?.value || "0",
		);
		const dayOfMonth = parseInt(
			dateParts.find((p) => p.type === "day")?.value || "0",
		);
		const currentHour = parseInt(
			dateParts.find((p) => p.type === "hour")?.value || "0",
		);
		const currentMinute = parseInt(
			dateParts.find((p) => p.type === "minute")?.value || "0",
		);

		//console.log('[BusinessHours] Checking day in store timezone:', day, 'Date:', `${year}-${month}-${dayOfMonth}`);

		// Check holidays using store timezone date
		const storeDate = new Date(year, month - 1, dayOfMonth, 0, 0, 0, 0);
		if (this.isOnHoliday(storeDate)) {
			//console.log('[BusinessHours] isOnHoliday returned true');
			return false;
		}

		const bizhours = (
			this.hours as unknown as { [key: string]: BusinessHoursDay }
		)[day];

		//console.log('[BusinessHours] Business hours for', day, ':', bizhours);

		if (typeof bizhours === "string" && bizhours === "closed") {
			//console.log('[BusinessHours] Day is marked as closed');
			return false;
		}

		if (!bizhours) {
			//console.log('[BusinessHours] No business hours found for', day);
			return false;
		}

		// check the time value in bizHourPair
		if (Array.isArray(bizhours)) {
			// Use time components already extracted in store timezone (server independent)
			const currentTimeMinutes = currentHour * 60 + currentMinute;
			const currentTimeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;
			//console.log('[BusinessHours] Current time in store timezone:', currentTimeStr, 'Input date (UTC):', dateToCheck.toISOString());

			for (let i = 0; i < Number(bizhours.length); i++) {
				//this should be a TimeRange like this: { from: "10:00", to: "13:30" }
				const bizHourPair = bizhours[i] as TimeRange;

				const from = bizHourPair.from;
				const to = bizHourPair.to;

				//console.log('[BusinessHours] Checking time range:', from, 'to', to);

				const fromHours = Number(from.substring(0, 2));
				const fromMinutes = Number(from.substring(3, 5));
				const toHours = Number(to.substring(0, 2));
				const toMinutes = Number(to.substring(3, 5));

				// Convert to minutes since midnight for easier comparison
				const fromTimeMinutes = fromHours * 60 + fromMinutes;
				const toTimeMinutes = toHours * 60 + toMinutes;

				/*
				console.log(
					'[BusinessHours]',
					day,
					'Current time (minutes):', currentTimeMinutes,
					'From time (minutes):', fromTimeMinutes,
					'To time (minutes):', toTimeMinutes,
					'Within range:', currentTimeMinutes >= fromTimeMinutes && currentTimeMinutes <= toTimeMinutes,
				);
				*/

				if (
					currentTimeMinutes >= fromTimeMinutes &&
					currentTimeMinutes <= toTimeMinutes
				) {
					//console.log('[BusinessHours] Store is OPEN - time is within range');
					return true;
				}
			}
			//console.log('[BusinessHours] Store is CLOSED - time is not within any range');
		}

		return false;
	}

	// Returns true if your business is open right now.
	public isOpenNow(): boolean {
		const now = this.now();

		return this.isOpenOn(now);
	}

	// Returns true if your business is closed right now.
	public isClosedNow(): boolean {
		return !this.isOpenNow();
	}

	// Returns true if your business is open tomorrow.
	public isOpenTomorrow(): boolean {
		const tmp = this.now().setDate(this.now().getDate() + 1);
		const tomorrow = new Date(tmp);

		const day = this._getISOWeekDayName(tomorrow.getDay());

		const bizhours = (
			this.hours as unknown as { [key: string]: BusinessHoursDay }
		)[day];

		if (typeof bizhours === "string" && bizhours === "closed") {
			return false;
		}
		if (Array.isArray(bizhours)) return true;

		//console.log("tomorrow", day, formatDate(tomorrow, "yyyy-MM-dd HH:mm"));

		return false;
	}

	// Returns true if your business will be open on the given date.
	public willBeOpenedOn(date: Date): boolean {
		const day = this._getISOWeekDayName(date.getDay());

		const bizhours = (
			this.hours as unknown as { [key: string]: BusinessHoursDay }
		)[day];

		if (typeof bizhours === "string" && bizhours === "closed") {
			return false;
		}
		if (Array.isArray(bizhours)) return true;

		//console.log("tomorrow", day, formatDate(tomorrow, "yyyy-MM-dd HH:mm"));

		return false;
	}

	// Returns the next opening date. If argument is set to true, the next opening date could be today.
	public nextOpeningDate(includeToday = false): Date {
		const now = this.now();
		let dateToCheck = now;

		if (!includeToday) {
			const tmp = now.setDate(now.getDate() + 1);
			dateToCheck = new Date(tmp);
		}
		const tmp = dateToCheck.setHours(0, 0, 0, 0);
		dateToCheck = new Date(tmp);

		let nextOpeningDate = null;
		while (nextOpeningDate === null) {
			if (this.willBeOpenedOn(dateToCheck)) {
				nextOpeningDate = dateToCheck;
			} else {
				const tmp = now.setDate(now.getDate() + 1);
				dateToCheck = new Date(tmp);
			}
		}

		/*
    console.log(
      "nextOpeningDate",
      this._getISOWeekDayName(nextOpeningDate.getDay()),
      formatDate(nextOpeningDate, "yyyy-MM-dd HH:mm"),
    );
    */

		return nextOpeningDate;
	}

	public nextOpeningHour(): string {
		const nextOpeningDate = this.nextOpeningDate();
		const day = this._getISOWeekDayName(nextOpeningDate.getDay());
		const bizhours = (
			this.hours as unknown as { [key: string]: BusinessHoursDay }
		)[day];

		if (typeof bizhours === "string") return bizhours;

		if (Array.isArray(bizhours)) {
			const nextOpeningTime = bizhours[0].from;

			return nextOpeningTime;
		}

		return "";
	}

	public isOnHoliday(date?: Date): boolean {
		if (!this.hours.holidays) return false;
		if (this.hours.holidays.length === 0) return false;

		const tmp = date || this.now();
		const tmpVal = tmp.setHours(0, 0, 0, 0);
		const dateToCheck = new Date(tmpVal);

		for (let i = 0; i < this.hours.holidays.length; i++) {
			const holiday = new Date(Date.parse(this.hours.holidays[i]));

			const fromTime = new Date(
				holiday.getFullYear(),
				holiday.getMonth(),
				holiday.getDate(),
				Number(0),
				Number(0),
			);
			const toTime = new Date(
				holiday.getFullYear(),
				holiday.getMonth(),
				holiday.getDate(),
				Number(23),
				Number(59),
			);

			if (dateToCheck >= fromTime && dateToCheck <= toTime) {
				return true;
			}
		}

		return false;
	}

	set hours(h: Partial<WeeklySchedule>) {
		this._hours = h as WeeklySchedule;
	}

	// check the time defined inside to/from node.
	_isHourValid(time: string) {
		if (time === "closed") return true;
		if (time.length !== 5) return false;
		if (time.indexOf(":") !== 2) return false;

		const modifiedTime = time.replace(":", "");

		if (Number.isNaN(modifiedTime)) return false;

		return true;
	}

	_getISOWeekDayName(isoDay: number) {
		// JavaScript getDay() returns: 0=Sunday, 1=Monday, 2=Tuesday, ..., 6=Saturday
		// weekdays array is: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
		// So we need to map: Sunday(0)->index 6, Monday(1)->index 0, Tuesday(2)->index 1, etc.
		return weekdays[isoDay === 0 ? 6 : isoDay - 1];
	}
}
