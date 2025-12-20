"use client";

import { IconBell } from "@tabler/icons-react";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";

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
		<button
			onClick={onOpen}
			className={cn(
				"relative inline-flex items-center justify-center rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
				"h-10 w-10 sm:h-9 sm:w-9",
				className,
			)}
			aria-label={t("notifications")}
		>
			<IconBell className="h-5 w-5" />
			{unreadCount > 0 && (
				<span
					className={cn(
						"absolute right-0 top-0 flex items-center justify-center rounded-full bg-[#e41e3f] text-white font-semibold",
						// Facebook-style badge: small number badge for all counts
						unreadCount > 99
							? "h-4 w-4 min-h-[16px] min-w-[16px] text-[9px] px-0.5 leading-none"
							: unreadCount > 9
								? "h-4 w-4 min-h-[16px] min-w-[16px] text-[10px] px-0.5 leading-none"
								: "h-3.5 w-3.5 min-h-[14px] min-w-[14px] text-[9px] leading-none",
					)}
					aria-label={`${unreadCount} unread ${t("notifications")}`}
				>
					{unreadCount > 99 ? "99+" : unreadCount}
				</span>
			)}
			<span className="sr-only">{t("notifications")}</span>
		</button>
	);
}
