"use client";

import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/providers/i18n-provider";

interface BusinessHoursHolidaysProps {
	holidays: string[];
	disabled?: boolean;
	onAddHoliday: () => void;
	onRemoveHoliday: (index: number) => void;
	onUpdateHoliday: (index: number, value: string) => void;
}

export function BusinessHoursHolidays({
	holidays,
	disabled = false,
	onAddHoliday,
	onRemoveHoliday,
	onUpdateHoliday,
}: BusinessHoursHolidaysProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	return (
		<div className="rounded-md p-3 space-y-2">
			<div className="text-sm font-medium">
				{t("business_hours_editor_holidays")}
			</div>

			{holidays.length === 0 && (
				<div className="text-xs text-muted-foreground">
					{t("business_hours_editor_no_holidays")}
				</div>
			)}

			{holidays.map((holiday, index) => (
				<div key={`holiday-${index}`} className="flex items-center gap-2">
					<Input
						disabled={disabled}
						type="date"
						value={holiday}
						onChange={(event) => onUpdateHoliday(index, event.target.value)}
						className="h-10 sm:h-9"
					/>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={() => onRemoveHoliday(index)}
						disabled={disabled}
						className="h-10 w-10 sm:h-9 sm:w-9"
					>
						<IconTrash className="h-4 w-4" />
					</Button>
				</div>
			))}

			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={onAddHoliday}
				disabled={disabled}
				className="h-10 sm:h-9"
			>
				<IconPlus className="mr-2 h-4 w-4" />
				{t("business_hours_editor_add_holiday")}
			</Button>
		</div>
	);
}
