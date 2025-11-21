"use client";

import { useMemo } from "react";
import type { SupportTicket } from "@/types";
import { formatDateTime } from "@/utils/datetime-utils";
import { cn } from "@/lib/utils";

// Types
interface DisplayTicketProps {
	item: SupportTicket;
	className?: string;
	showCreator?: boolean;
	showDate?: boolean;
	compact?: boolean;
}

interface TicketHeaderProps {
	modifier?: string;
	creationDate?: Date;
	compact?: boolean;
}

interface TicketMessageProps {
	message?: string;
	compact?: boolean;
}

// Memoized ticket header component
const TicketHeader = ({
	modifier,
	creationDate,
	compact = false,
}: TicketHeaderProps) => {
	const formattedDate = useMemo(() => {
		if (!creationDate) return "";
		return formatDateTime(creationDate);
	}, [creationDate]);

	if (!modifier && !creationDate) return null;

	return (
		<div
			className={cn(
				"grid gap-1",
				compact ? "grid-cols-1 text-xs" : "grid-cols-2 text-sm",
			)}
		>
			{modifier && (
				<div className="font-medium text-gray-700 dark:text-gray-300">
					{modifier}
				</div>
			)}
			{creationDate && (
				<div
					className={cn(
						"text-gray-500 dark:text-gray-400",
						compact ? "text-left" : "text-right",
					)}
				>
					{formattedDate}
				</div>
			)}
		</div>
	);
};

// Memoized ticket message component
const TicketMessage = ({ message, compact = false }: TicketMessageProps) => {
	if (!message) return null;

	return (
		<div
			className={cn(
				"text-gray-800 dark:text-gray-200 overflow-hidden text-clip",
				compact ? "text-xs" : "text-sm",
			)}
		>
			{message}
		</div>
	);
};

export const DisplayTicket: React.FC<DisplayTicketProps> = ({
	item,
	className = "",
	showCreator = true,
	showDate = true,
	compact = false,
}) => {
	// Memoized ticket data
	const ticketData = useMemo(
		() => ({
			modifier: showCreator ? item.modifier : undefined,
			creationDate: showDate
				? item.createdAt || (item as { creationDate?: Date }).creationDate
				: undefined,
			message: item.message,
		}),
		[item.modifier, item.createdAt, item.message, showCreator, showDate],
	);

	// Memoized container classes
	const containerClasses = useMemo(
		() =>
			cn(
				"rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200",
				compact ? "p-2 gap-1" : "p-3 gap-1",
				className,
			),
		[compact, className],
	);

	return (
		<article className={containerClasses} aria-label="Support ticket message">
			<TicketHeader
				modifier={ticketData.modifier}
				creationDate={ticketData.creationDate}
				compact={compact}
			/>
			<TicketMessage message={ticketData.message} compact={compact} />
		</article>
	);
};
