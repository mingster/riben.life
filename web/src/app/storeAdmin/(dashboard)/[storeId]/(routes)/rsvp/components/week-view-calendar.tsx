"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import {
	format,
	startOfWeek,
	endOfWeek,
	addWeeks,
	subWeeks,
	isSameDay,
	parseISO,
} from "date-fns";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { RsvpColumn } from "../history/rsvp-column";
import { AdminEditRsvpDialog } from "./admin-edit-rsvp-dialog";

// Component for creating RSVP at specific time slot
interface CreateRsvpButtonProps {
	day: Date;
	timeSlot: string;
	onCreated?: (rsvp: RsvpColumn) => void;
}

const CreateRsvpButton: React.FC<CreateRsvpButtonProps> = ({
	day,
	timeSlot,
	onCreated,
}) => {
	const [defaultRsvpTime] = useState(() => {
		const [hours, minutes] = timeSlot.split(":").map(Number);
		const rsvpTime = new Date(day);
		rsvpTime.setHours(hours, minutes, 0, 0);
		return rsvpTime;
	});

	return (
		<AdminEditRsvpDialog
			isNew
			defaultRsvpTime={defaultRsvpTime}
			onCreated={onCreated}
			trigger={
				<button
					type="button"
					className="w-full h-full min-h-[60px] text-left p-2 rounded hover:bg-muted/50 transition-colors text-xs text-muted-foreground"
				>
					+
				</button>
			}
		/>
	);
};

interface WeekViewCalendarProps {
	rsvps: RsvpColumn[];
	onRsvpCreated?: (rsvp: RsvpColumn) => void;
	onRsvpUpdated?: (rsvp: RsvpColumn) => void;
}

// Generate time slots (e.g., 8:00 AM to 10:00 PM)
const generateTimeSlots = (): string[] => {
	const slots: string[] = [];
	for (let hour = 8; hour < 22; hour++) {
		slots.push(`${hour.toString().padStart(2, "0")}:00`);
	}
	return slots;
};

// Get day name abbreviation using i18n
const getDayName = (date: Date, t: (key: string) => string): string => {
	const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
	const dayNames: Record<number, string> = {
		0: "weekday_Sunday",
		1: "weekday_Monday",
		2: "weekday_Tuesday",
		3: "weekday_Wednesday",
		4: "weekday_Thursday",
		5: "weekday_Friday",
		6: "weekday_Saturday",
	};
	return t(dayNames[dayOfWeek] || "weekday_Sunday");
};

// Get day number
const getDayNumber = (date: Date): string => {
	return format(date, "d");
};

// Check if a date is today
const isToday = (date: Date): boolean => {
	return isSameDay(date, new Date());
};

// Group RSVPs by day and time slot
// RSVPs are placed in the time slot that matches their hour (rounded to nearest hour)
const groupRsvpsByDayAndTime = (
	rsvps: RsvpColumn[],
	weekStart: Date,
	weekEnd: Date,
) => {
	const grouped: Record<string, RsvpColumn[]> = {};

	rsvps.forEach((rsvp) => {
		const rsvpDate =
			rsvp.rsvpTime instanceof Date
				? rsvp.rsvpTime
				: parseISO(
						typeof rsvp.rsvpTime === "string"
							? rsvp.rsvpTime
							: String(rsvp.rsvpTime),
					);

		// Check if RSVP is within the week
		if (rsvpDate >= weekStart && rsvpDate <= weekEnd) {
			const dayKey = format(rsvpDate, "yyyy-MM-dd");
			// Round to nearest hour for time slot matching
			const hour = rsvpDate.getHours();
			const timeKey = `${hour.toString().padStart(2, "0")}:00`;
			const key = `${dayKey}-${timeKey}`;

			if (!grouped[key]) {
				grouped[key] = [];
			}
			grouped[key].push(rsvp);
		}
	});

	return grouped;
};

export const WeekViewCalendar: React.FC<WeekViewCalendarProps> = ({
	rsvps,
	onRsvpCreated,
	onRsvpUpdated,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [currentWeek, setCurrentWeek] = useState(new Date());
	const timeSlots = useMemo(() => generateTimeSlots(), []);

	const weekStart = useMemo(
		() => startOfWeek(currentWeek, { weekStartsOn: 0 }), // Sunday
		[currentWeek],
	);
	const weekEnd = useMemo(
		() => endOfWeek(currentWeek, { weekStartsOn: 0 }), // Saturday
		[currentWeek],
	);

	// Generate days of the week
	const weekDays = useMemo(() => {
		const days: Date[] = [];
		for (let i = 0; i < 7; i++) {
			const date = new Date(weekStart);
			date.setDate(weekStart.getDate() + i);
			days.push(date);
		}
		return days;
	}, [weekStart]);

	// Group RSVPs by day and time
	const groupedRsvps = useMemo(
		() => groupRsvpsByDayAndTime(rsvps, weekStart, weekEnd),
		[rsvps, weekStart, weekEnd],
	);

	const handlePreviousWeek = useCallback(() => {
		setCurrentWeek((prev) => subWeeks(prev, 1));
	}, []);

	const handleNextWeek = useCallback(() => {
		setCurrentWeek((prev) => addWeeks(prev, 1));
	}, []);

	const handleToday = useCallback(() => {
		setCurrentWeek(new Date());
	}, []);

	const getRsvpsForSlot = (day: Date, timeSlot: string): RsvpColumn[] => {
		const dayKey = format(day, "yyyy-MM-dd");
		const key = `${dayKey}-${timeSlot}`;
		return groupedRsvps[key] || [];
	};

	return (
		<div className="flex flex-col gap-4">
			{/* Week Navigation */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 font-mono text-sm">
					<Button variant="outline" size="icon" onClick={handlePreviousWeek}>
						<IconChevronLeft className="h-4 w-4" />
					</Button>
					<Button variant="outline" onClick={handleToday}>
						{t("today")}
					</Button>
					<Button variant="outline" size="icon" onClick={handleNextWeek}>
						<IconChevronRight className="h-4 w-4" />
					</Button>
					<span className="ml-4 text-lg font-semibold">
						{format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
					</span>
				</div>
			</div>

			{/* Calendar Grid */}
			<div className="border rounded-lg overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full border-collapse">
						<thead>
							<tr>
								<th className="w-20 border-b border-r p-2 text-left text-sm font-medium text-muted-foreground">
									Time
								</th>
								{weekDays.map((day) => (
									<th
										key={day.toISOString()}
										className={cn(
											"border-b border-r p-2 text-center text-sm font-medium",
											isToday(day) && "bg-primary/10",
											"last:border-r-0",
										)}
									>
										<div className="flex flex-col">
											<span className="text-xs text-muted-foreground">
												{getDayName(day, t)}
											</span>
											<span
												className={cn(
													"text-lg font-semibold",
													isToday(day) && "text-primary",
												)}
											>
												{getDayNumber(day)}
											</span>
										</div>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{timeSlots.map((timeSlot) => (
								<tr key={timeSlot}>
									<td className="border-b border-r p-2 text-sm text-muted-foreground">
										{timeSlot}
									</td>
									{weekDays.map((day) => {
										const slotRsvps = getRsvpsForSlot(day, timeSlot);
										return (
											<td
												key={`${day.toISOString()}-${timeSlot}`}
												className={cn(
													"border-b border-r p-1 min-w-[120px] align-top",
													isToday(day) && "bg-primary/5",
													"last:border-r-0",
												)}
											>
												<div className="flex flex-col gap-1 min-h-[60px]">
													{slotRsvps.length > 0 ? (
														slotRsvps.map((rsvp) => (
															<AdminEditRsvpDialog
																key={rsvp.id}
																rsvp={rsvp}
																onUpdated={onRsvpUpdated}
																trigger={
																	<button
																		type="button"
																		className={cn(
																			"text-left p-2 rounded text-xs bg-primary/10 hover:bg-primary/20 transition-colors",
																			rsvp.confirmedByStore &&
																				"border-l-2 border-l-green-500",
																			rsvp.alreadyPaid &&
																				"border-l-2 border-l-blue-500",
																		)}
																	>
																		<div className="font-medium truncate">
																			{rsvp.numOfAdult + rsvp.numOfChild}{" "}
																			{rsvp.numOfAdult + rsvp.numOfChild === 1
																				? "guest"
																				: "guests"}
																		</div>
																		{rsvp.message && (
																			<div className="text-muted-foreground truncate text-[10px]">
																				{rsvp.message}
																			</div>
																		)}
																	</button>
																}
															/>
														))
													) : (
														<CreateRsvpButton
															day={day}
															timeSlot={timeSlot}
															onCreated={onRsvpCreated}
														/>
													)}
												</div>
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};
