"use client";

import { cn } from "@/lib/utils";
import { RsvpStatus } from "@/types/enum";
import { getRsvpStatusColorClasses } from "@/utils/rsvp-status-utils";
import type { TFunction } from "i18next";

interface RsvpStatusLegendProps {
	t: TFunction;
	className?: string;
}

/**
 * Shared Status Legend component for RSVP statuses
 * Displays all RSVP statuses with their corresponding colors
 */
export function RsvpStatusLegend({ t, className }: RsvpStatusLegendProps) {
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
				].map((status) => (
					<div
						key={status}
						className={cn(
							"flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs font-mono",
							getRsvpStatusColorClasses(status, false),
						)}
					>
						<span className="font-medium">{t(`rsvp_status_${status}`)}</span>
					</div>
				))}
			</div>
		</div>
	);
}
