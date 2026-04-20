"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { TimezoneSelect } from "@/components/timezone-select";
import { FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { BusinessHoursDayRow } from "@/lib/businessHours/business-hours-day-row";
import {
	type BusinessHoursFormModel,
	DEFAULT_RANGE,
	parseBusinessHoursJsonToFormModel,
	serializeBusinessHoursFormModel,
	validateBusinessHoursFormModel,
} from "@/lib/businessHours/business-hours-form-utils";
import { BusinessHoursHolidays } from "@/lib/businessHours/business-hours-holidays";
import { useI18n } from "@/providers/i18n-provider";

interface BusinessHoursEditorProps {
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	defaultTimezone?: string;
}

export function BusinessHoursEditor({
	value,
	onChange,
	disabled = false,
	defaultTimezone,
}: BusinessHoursEditorProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [model, setModel] = useState<BusinessHoursFormModel>(() =>
		parseBusinessHoursJsonToFormModel(value, defaultTimezone),
	);
	const [parseError, setParseError] = useState<string | null>(null);

	useEffect(() => {
		try {
			const parsed = parseBusinessHoursJsonToFormModel(value, defaultTimezone);
			setModel(parsed);
			setParseError(null);
		} catch (error) {
			setParseError(
				error instanceof Error
					? error.message
					: t("business_hours_editor_invalid_business_hours"),
			);
		}
	}, [value, defaultTimezone, t]);

	const validationErrors = useMemo(
		() => validateBusinessHoursFormModel(model),
		[model],
	);

	const updateModel = (
		updater: (current: BusinessHoursFormModel) => BusinessHoursFormModel,
	) => {
		const nextModel = updater(model);
		setModel(nextModel);
		onChange(serializeBusinessHoursFormModel(nextModel));
	};

	const formatValidationError = (error: string): string => {
		const splitIndex = error.indexOf(":");
		if (splitIndex <= 0) {
			return error;
		}

		const weekday = error.slice(0, splitIndex).trim();
		const detail = error.slice(splitIndex + 1).trim();
		const dayLabel = t(`weekday_${weekday.toLowerCase()}`) || weekday;

		if (detail === "start time must be before end time.") {
			return `${dayLabel}: ${t("business_hours_editor_error_start_before_end")}`;
		}
		if (detail === "time ranges must not overlap.") {
			return `${dayLabel}: ${t("business_hours_editor_error_no_overlap")}`;
		}
		return `${dayLabel}: ${detail}`;
	};

	return (
		<div className="space-y-3 border border-gray-200 dark:border-gray-900 rounded-md p-3">
			<div className="rounded-md p-3 space-y-2">
				<div className="text-sm font-medium">
					{t("business_hours_editor_timezone")}
				</div>
				<TimezoneSelect
					value={model.timeZone}
					onValueChange={(value) =>
						updateModel((current) => ({ ...current, timeZone: value }))
					}
					disabled={disabled}
				/>
				<FormDescription className="text-xs font-mono text-gray-500">
					{t("business_hours_editor_timezone_hint")}
				</FormDescription>
			</div>

			<div className="grid grid-cols-1 gap-2">
				{model.days.map((dayConfig, dayIndex) => (
					<BusinessHoursDayRow
						key={dayConfig.day}
						day={dayConfig}
						disabled={disabled}
						onToggleClosed={(isClosed) =>
							updateModel((current) => {
								const nextDays = [...current.days];
								nextDays[dayIndex] = {
									...nextDays[dayIndex],
									isClosed,
									ranges: isClosed
										? []
										: nextDays[dayIndex].ranges.length > 0
											? nextDays[dayIndex].ranges
											: [{ ...DEFAULT_RANGE }],
								};
								return { ...current, days: nextDays };
							})
						}
						onAddRange={() =>
							updateModel((current) => {
								const nextDays = [...current.days];
								nextDays[dayIndex] = {
									...nextDays[dayIndex],
									ranges: [...nextDays[dayIndex].ranges, { ...DEFAULT_RANGE }],
								};
								return { ...current, days: nextDays };
							})
						}
						onRemoveRange={(rangeIndex) =>
							updateModel((current) => {
								const nextDays = [...current.days];
								nextDays[dayIndex] = {
									...nextDays[dayIndex],
									ranges: nextDays[dayIndex].ranges.filter(
										(_, index) => index !== rangeIndex,
									),
								};
								return { ...current, days: nextDays };
							})
						}
						onUpdateRange={(rangeIndex, field, fieldValue) =>
							updateModel((current) => {
								const nextDays = [...current.days];
								nextDays[dayIndex] = {
									...nextDays[dayIndex],
									ranges: nextDays[dayIndex].ranges.map((range, index) =>
										index === rangeIndex
											? { ...range, [field]: fieldValue }
											: range,
									),
								};
								return { ...current, days: nextDays };
							})
						}
					/>
				))}
			</div>

			<BusinessHoursHolidays
				holidays={model.holidays}
				disabled={disabled}
				onAddHoliday={() =>
					updateModel((current) => ({
						...current,
						holidays: [...current.holidays, ""],
					}))
				}
				onRemoveHoliday={(holidayIndex) =>
					updateModel((current) => ({
						...current,
						holidays: current.holidays.filter(
							(_, index) => index !== holidayIndex,
						),
					}))
				}
				onUpdateHoliday={(holidayIndex, holidayValue) =>
					updateModel((current) => ({
						...current,
						holidays: current.holidays.map((holiday, index) =>
							index === holidayIndex ? holidayValue : holiday,
						),
					}))
				}
			/>

			{parseError && (
				<div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
					{t("business_hours_editor_parse_failed")}: {parseError}
				</div>
			)}

			{validationErrors.length > 0 && (
				<div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 space-y-1">
					<div className="text-xs font-semibold text-destructive">
						{t("business_hours_editor_validation_errors")}
					</div>
					{validationErrors.map((error) => (
						<div key={error} className="text-xs text-destructive">
							- {formatValidationError(error)}
						</div>
					))}
				</div>
			)}

			<details>
				<summary className="cursor-pointer text-xs text-muted-foreground">
					{t("business_hours_editor_json_preview")}
				</summary>
				<Textarea
					value={serializeBusinessHoursFormModel(model)}
					readOnly
					className="mt-2 min-h-[120px] font-mono text-xs"
				/>
			</details>
		</div>
	);
}
