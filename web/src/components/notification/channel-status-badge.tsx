"use client";

import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
	NotificationChannel,
	DeliveryStatus,
} from "@/lib/notification/types";
import { epochToDate } from "@/utils/datetime-utils";
import { formatDateTime } from "@/utils/datetime-utils";
import { IconCheck, IconX, IconClock, IconSend } from "@tabler/icons-react";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

export interface ChannelStatusBadgeProps {
	channel: NotificationChannel;
	status: DeliveryStatus;
	size?: "sm" | "md" | "lg";
	errorMessage?: string | null;
	deliveredAt?: number | bigint | null;
	readAt?: number | bigint | null;
	createdAt?: number | bigint | null;
	updatedAt?: number | bigint | null;
	className?: string;
}

const channelLabels: Record<NotificationChannel, string> = {
	onsite: "On-Site",
	email: "Email",
	line: "LINE",
	whatsapp: "WhatsApp",
	wechat: "WeChat",
	sms: "SMS",
	telegram: "Telegram",
	push: "Push",
};

const statusLabels: Record<DeliveryStatus, string> = {
	pending: "Pending",
	sent: "Sent",
	delivered: "Delivered",
	read: "Read",
	failed: "Failed",
	bounced: "Bounced",
};

const statusColors: Record<DeliveryStatus, string> = {
	pending: "bg-gray-500",
	sent: "bg-blue-500",
	delivered: "bg-green-500",
	read: "bg-green-600",
	failed: "bg-red-500",
	bounced: "bg-orange-500",
};

const statusIcons: Record<DeliveryStatus, typeof IconCheck> = {
	pending: IconClock,
	sent: IconSend,
	delivered: IconCheck,
	read: IconCheck,
	failed: IconX,
	bounced: IconX,
};

const sizeClasses = {
	sm: "text-xs px-1.5 py-0.5",
	md: "text-sm px-2 py-1",
	lg: "text-base px-3 py-1.5",
};

export function ChannelStatusBadge({
	channel,
	status,
	size = "md",
	errorMessage,
	deliveredAt,
	readAt,
	createdAt,
	updatedAt,
	className,
}: ChannelStatusBadgeProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const channelLabel = channelLabels[channel] || channel;
	const statusLabel = statusLabels[status] || status;
	const statusColor = statusColors[status] || "bg-gray-500";
	const StatusIcon = statusIcons[status] || IconClock;

	// Build tooltip content
	const tooltipContent = [];
	if (errorMessage) {
		tooltipContent.push(`Error: ${errorMessage}`);
	}
	if (deliveredAt) {
		const deliveredDate = epochToDate(
			typeof deliveredAt === "bigint" ? deliveredAt : BigInt(deliveredAt),
		);
		if (deliveredDate) {
			tooltipContent.push(`Delivered: ${formatDateTime(deliveredDate)}`);
		}
	}
	if (readAt) {
		const readDate = epochToDate(
			typeof readAt === "bigint" ? readAt : BigInt(readAt),
		);
		if (readDate) {
			tooltipContent.push(`Read: ${formatDateTime(readDate)}`);
		}
	}
	if (createdAt) {
		const createdDate = epochToDate(
			typeof createdAt === "bigint" ? createdAt : BigInt(createdAt),
		);
		if (createdDate) {
			tooltipContent.push(`Created: ${formatDateTime(createdDate)}`);
		}
	}
	if (updatedAt) {
		const updatedDate = epochToDate(
			typeof updatedAt === "bigint" ? updatedAt : BigInt(updatedAt),
		);
		if (updatedDate) {
			tooltipContent.push(`Updated: ${formatDateTime(updatedDate)}`);
		}
	}

	const hasTooltip = tooltipContent.length > 0 || errorMessage;

	const badge = (
		<Badge
			variant="secondary"
			className={`${statusColor} text-white ${sizeClasses[size]} flex items-center gap-1 ${className || ""}`}
		>
			<StatusIcon className="h-3 w-3" />
			<span className="font-medium">{channelLabel}</span>
			<span className="opacity-90">:</span>
			<span>{statusLabel}</span>
		</Badge>
	);

	if (hasTooltip) {
		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>{badge}</TooltipTrigger>
					<TooltipContent className="max-w-xs">
						<div className="space-y-1 text-xs">
							<div className="font-semibold">
								{channelLabel} - {statusLabel}
							</div>
							{tooltipContent.map((line, index) => (
								<div key={index}>{line}</div>
							))}
						</div>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	}

	return badge;
}
