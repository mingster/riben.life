"use client";

import { cn } from "@/lib/utils";
import { RsvpStatus } from "@/types/enum";
import { getRsvpStatusColorClasses } from "@/utils/rsvp-status-utils";
import type { TFunction } from "i18next";
import { IconCheck } from "@tabler/icons-react";

interface RsvpStatusLegendProps {
	t: TFunction;
	className?: string;
	selectedStatuses?: RsvpStatus[];
	onStatusClick?: (status: RsvpStatus) => void;
}

/**
 * Shared Status Legend component for RSVP statuses
 * Displays all RSVP statuses with their corresponding colors
 * Optionally allows clicking on statuses to filter RSVPs
 */
export function RsvpStatusLegend({
	t,
	className,
	selectedStatuses = [],
	onStatusClick,
}: RsvpStatusLegendProps) {
	const isClickable = Boolean(onStatusClick);

	return (
		<div
			className={cn("mt-2 p-2 sm:p-4 border rounded-lg bg-muted/30", className)}
		>
			<div className="text-xs mb-2 sm:mb-3">{t("rsvp_status")}</div>
			<div className="flex flex-wrap gap-1">
				{[
					RsvpStatus.Pending,
					RsvpStatus.ReadyToConfirm,
					RsvpStatus.Ready,
					RsvpStatus.Completed,
					RsvpStatus.Cancelled,
					RsvpStatus.NoShow,
				].map((status) => {
					const isSelected = selectedStatuses.includes(status);
					const StatusComponent = isClickable ? "button" : "div";

					return (
						<StatusComponent
							key={status}
							type={isClickable ? "button" : undefined}
							onClick={isClickable ? () => onStatusClick?.(status) : undefined}
							className={cn(
								"flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs font-mono transition-all",
								getRsvpStatusColorClasses(status, false),
								isClickable &&
									"cursor-pointer hover:opacity-80 active:scale-95 touch-manipulation",
								isSelected && "ring-2 ring-offset-2 ring-primary",
							)}
						>
							{isSelected && <IconCheck className="h-3 w-3 sm:h-4 sm:w-4" />}
							<span className="font-medium">{t(`rsvp_status_${status}`)}</span>
						</StatusComponent>
					);
				})}
			</div>
		</div>
	);
}
