"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconBell } from "@tabler/icons-react";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

export interface NotificationBellProps {
	unreadCount: number;
	onOpen?: () => void;
	className?: string;
}

export function NotificationBell({
	unreadCount,
	onOpen,
	className,
}: NotificationBellProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={onOpen}
			className={`relative h-10 w-10 min-h-[44px] min-w-[44px] sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0 ${className || ""}`}
		>
			<IconBell className="h-5 w-5" />
			{unreadCount > 0 && (
				<Badge
					variant="destructive"
					className="absolute -right-0.5 -top-0.5 h-5 w-5 min-h-[20px] min-w-[20px] flex items-center justify-center rounded-full p-0 text-xs"
				>
					{unreadCount > 99 ? "99+" : unreadCount}
				</Badge>
			)}
			<span className="sr-only">{t("notifications")}</span>
		</Button>
	);
}
