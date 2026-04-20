"use client";

import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { BusinessHoursFormDay } from "@/lib/businessHours/business-hours-form-utils";
import { useI18n } from "@/providers/i18n-provider";

interface BusinessHoursDayRowProps {
	day: BusinessHoursFormDay;
	disabled?: boolean;
	onToggleClosed: (isClosed: boolean) => void;
	onAddRange: () => void;
	onRemoveRange: (index: number) => void;
	onUpdateRange: (index: number, field: "from" | "to", value: string) => void;
}

export function BusinessHoursDayRow({
	day,
	disabled = false,
	onToggleClosed,
	onAddRange,
	onRemoveRange,
	onUpdateRange,
}: BusinessHoursDayRowProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const dayLabel = t(`weekday_${day.day.toLowerCase()}`) || day.day;

	return (
		<div className="rounded-md p-3 space-y-2">
			<div className="flex items-center justify-between">
				<div className="text-sm font-medium">{dayLabel}</div>
				<div className="flex items-center gap-2">
					<span className="text-xs text-muted-foreground">
						{t("business_hours_editor_closed")}
					</span>
					<Switch
						disabled={disabled}
						checked={day.isClosed}
						onCheckedChange={onToggleClosed}
					/>
				</div>
			</div>

			{!day.isClosed && (
				<div className="space-y-2">
					{day.ranges.map((range, rangeIndex) => (
						<div
							key={`${day.day}-${rangeIndex}`}
							className="flex items-center gap-2"
						>
							<Input
								disabled={disabled}
								type="time"
								value={range.from}
								onChange={(event) =>
									onUpdateRange(rangeIndex, "from", event.target.value)
								}
								className="h-10 sm:h-9"
							/>
							<span className="text-xs text-muted-foreground">{t("to")}</span>
							<Input
								disabled={disabled}
								type="time"
								value={range.to}
								onChange={(event) =>
									onUpdateRange(rangeIndex, "to", event.target.value)
								}
								className="h-10 sm:h-9"
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={() => onRemoveRange(rangeIndex)}
								disabled={disabled || day.ranges.length === 1}
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
						onClick={onAddRange}
						disabled={disabled}
						className="h-10 sm:h-9"
					>
						<IconPlus className="mr-2 h-4 w-4" />
						{t("business_hours_editor_add_range")}
					</Button>
				</div>
			)}
		</div>
	);
}
