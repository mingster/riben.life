"use client";

import { useMemo } from "react";
import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { TicketStatus } from "@/types/enum";

// Types
interface DisplayTicketStatusProps {
	status: TicketStatus;
	onCompletedStatus?: () => void;
	className?: string;
	showIcon?: boolean;
	compact?: boolean;
	variant?: "default" | "badge" | "button";
}

interface StatusConfig {
	label: string;
	className: string;
	icon?: React.ReactNode;
}

export const DisplayTicketStatus: React.FC<DisplayTicketStatusProps> = ({
	status,
	onCompletedStatus,
	className = "",
	showIcon = true,
	compact = true,
	variant = "default",
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	// Memoized status configuration
	const statusConfig = useMemo((): StatusConfig => {
		const statusKey = `TicketStatus_${TicketStatus[Number(status)]}`;
		const label = t(statusKey);

		switch (status) {
			case TicketStatus.Closed:
				return {
					label,
					className:
						"bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
					icon: showIcon ? "🔒" : undefined,
				};
			case TicketStatus.Open:
				return {
					label,
					className:
						"bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
					icon: showIcon ? "🔓" : undefined,
				};
			case TicketStatus.Active:
				return {
					label,
					className:
						"bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
					icon: showIcon ? "🔄" : undefined,
				};
			case TicketStatus.Replied:
				return {
					label,
					className:
						"bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
					icon: showIcon ? "💬" : undefined,
				};
			case TicketStatus.Postponed:
				return {
					label,
					className:
						"bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
					icon: showIcon ? "⏳" : undefined,
				};
			case TicketStatus.Archived:
				return {
					label,
					className:
						"bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
					icon: showIcon ? "📁" : undefined,
				};
			case TicketStatus.Merged:
				return {
					label,
					className:
						"bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400",
					icon: showIcon ? "🔗" : undefined,
				};
			default:
				return {
					label,
					className:
						"bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
				};
		}
	}, [status, t, showIcon]);

	// Memoized container classes
	const containerClasses = useMemo(() => {
		const baseClasses =
			"inline-flex items-center gap-1 font-medium rounded-full transition-colors duration-200";
		const sizeClasses = compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm";

		return cn(baseClasses, sizeClasses, statusConfig.className, className);
	}, [statusConfig.className, compact, className]);

	// Memoized button classes
	const buttonClasses = useMemo(() => {
		const baseClasses =
			"inline-flex items-center gap-1 font-medium rounded-full transition-colors duration-200 cursor-default";
		const sizeClasses = compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm";

		return cn(baseClasses, sizeClasses, statusConfig.className, className);
	}, [statusConfig.className, compact, className]);

	// Render based on variant
	if (variant === "button") {
		return (
			<Button
				variant="ghost"
				className={buttonClasses}
				size="sm"
				disabled
				aria-label={`Ticket status: ${statusConfig.label}`}
			>
				{statusConfig.icon && (
					<span aria-hidden="true">{statusConfig.icon}</span>
				)}
				<span>{statusConfig.label}</span>
			</Button>
		);
	}

	if (variant === "badge") {
		return (
			<output
				className={containerClasses}
				aria-label={`Ticket status: ${statusConfig.label}`}
			>
				{statusConfig.icon && (
					<span aria-hidden="true">{statusConfig.icon}</span>
				)}
				<span>{statusConfig.label}</span>
			</output>
		);
	}

	// Default variant
	return (
		<output
			className={cn("text-sm font-medium", className)}
			aria-label={`Ticket status: ${statusConfig.label}`}
		>
			{statusConfig.icon && (
				<span aria-hidden="true" className="mr-1">
					{statusConfig.icon}
				</span>
			)}
			{statusConfig.label}
		</output>
	);
};
