"use client";

import { cn } from "@/lib/utils";
import type { TFunction } from "i18next";
import { IconCheck } from "@tabler/icons-react";

export type RevenueType = "facility" | "service_staff";

interface RsvpRevenueTypeToggleProps {
	t: TFunction;
	className?: string;
	selectedTypes: RevenueType[];
	onTypeClick: (type: RevenueType) => void;
}

/**
 * Toggle component for filtering RSVP revenue by type
 * Similar to RsvpStatusLegend, allows clicking to toggle multiple revenue types
 */
export function RsvpRevenueTypeToggle({
	t,
	className,
	selectedTypes = [],
	onTypeClick,
}: RsvpRevenueTypeToggleProps) {
	const revenueTypes: Array<{
		type: RevenueType;
		labelKey: string;
		colorClass: string;
	}> = [
		{
			type: "facility",
			labelKey: "rsvp_revenue_type_facility",
			colorClass: "bg-green-100 text-gray-700 border-l-2 border-l-green-500",
		},
		{
			type: "service_staff",
			labelKey: "rsvp_revenue_type_service_staff",
			colorClass: "bg-purple-100 text-gray-700 border-l-2 border-l-purple-500",
		},
	];

	return (
		<div
			className={cn("mt-2", className)}
		>
			<div className="text-xs mb-2 sm:mb-3">
				{t("rsvp_revenue_type") || "Revenue Type"}
			</div>
			<div className="flex flex-wrap gap-1">
				{revenueTypes.map(({ type, labelKey, colorClass }) => {
					const isSelected = selectedTypes.includes(type);

					return (
						<button
							key={type}
							type="button"
							onClick={() => onTypeClick(type)}
							className={cn(
								"flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs font-mono transition-all cursor-pointer hover:opacity-80 active:scale-95 touch-manipulation",
								colorClass,
								isSelected && "ring-2 ring-offset-2 ring-primary",
							)}
						>
							{isSelected && <IconCheck className="h-3 w-3 sm:h-4 sm:w-4" />}
							<span className="font-medium">{t(labelKey)}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
