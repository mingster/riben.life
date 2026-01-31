"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { RsvpStatus } from "@/types/enum";
import { getRsvpStatusColorClasses } from "@/utils/rsvp-status-utils";
import type { TFunction } from "i18next";
import { IconCheck, IconChevronDown, IconChevronUp } from "@tabler/icons-react";

interface RsvpStatusLegendProps {
	t: TFunction;
	className?: string;
	selectedStatuses?: RsvpStatus[];
	onStatusClick?: (status: RsvpStatus) => void;
	/** When true, legend can be collapsed/expanded via a toggle */
	collapsible?: boolean;
	/** Initial expanded state when collapsible (default: true) */
	defaultExpanded?: boolean;
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
	collapsible = false,
	defaultExpanded = true,
}: RsvpStatusLegendProps) {
	const [expanded, setExpanded] = useState(defaultExpanded);
	const isClickable = Boolean(onStatusClick);

	return (
		<div className={cn("mt-2 border rounded-lg bg-muted/30", className)}>
			<button
				type="button"
				onClick={() => collapsible && setExpanded((p) => !p)}
				className={cn(
					"w-full flex items-center justify-between p-2 sm:p-4 text-left touch-manipulation",
					collapsible &&
						"cursor-pointer hover:bg-muted/50 rounded-lg transition-colors",
				)}
				aria-expanded={collapsible ? expanded : undefined}
			>
				<span className="text-xs sm:text-sm">{t("rsvp_status")}</span>
				{collapsible && (
					<span className="shrink-0">
						{expanded ? (
							<IconChevronUp className="h-4 w-4" />
						) : (
							<IconChevronDown className="h-4 w-4" />
						)}
					</span>
				)}
			</button>
			{(!collapsible || expanded) && (
				<div className="px-2 pb-2 sm:px-4 sm:pb-4 pt-0">
					<div className="flex flex-wrap gap-1.5 sm:gap-2">
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
									onClick={
										isClickable ? () => onStatusClick?.(status) : undefined
									}
									className={cn(
										"flex items-center gap-1.5 sm:gap-2 min-h-11 h-11 sm:min-h-0 sm:h-auto px-3 py-2 sm:px-3 sm:py-1.5 rounded text-xs sm:text-xs font-mono transition-all touch-manipulation",
										getRsvpStatusColorClasses(status, false),
										isClickable &&
											"cursor-pointer hover:opacity-80 active:scale-95",
										isSelected && "ring-2 ring-offset-2 ring-primary",
									)}
								>
									{isSelected && (
										<IconCheck className="h-4 w-4 sm:h-4 sm:w-4 shrink-0" />
									)}
									<span className="font-medium">
										{t(`rsvp_status_${status}`)}
									</span>
								</StatusComponent>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
