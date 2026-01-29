"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconTrash } from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { zhTW } from "date-fns/locale/zh-TW";
import { ja } from "date-fns/locale/ja";
import type { Locale } from "date-fns";
import { epochToDate } from "@/utils/datetime-utils";
import Image from "next/image";

const avatarPlaceholder = "/images/user/avatar_placeholder.png";

export interface NotificationCardProps {
	notification: {
		id: string;
		subject: string;
		message: string;
		notificationType: string | null;
		actionUrl: string | null;
		createdAt: number | bigint;
		isRead: boolean;
		Sender?: {
			id: string;
			name: string | null;
			email: string | null;
			image: string | null;
		} | null;
		Store?: {
			id: string;
			name: string | null;
		} | null;
	};
	onMarkAsRead?: (id: string) => void;
	onDelete?: (id: string) => void;
	showActions?: boolean;
	className?: string;
}

export function NotificationCard({
	notification,
	onMarkAsRead,
	onDelete,
	showActions = true,
	className,
}: NotificationCardProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const router = useRouter();

	const dateLocale = useMemo((): Locale => {
		const localeMap: Record<string, Locale> = {
			en: enUS,
			tw: zhTW,
			jp: ja,
		};
		return localeMap[lng ?? "en"] ?? enUS;
	}, [lng]);

	const createdAt = epochToDate(
		typeof notification.createdAt === "bigint"
			? notification.createdAt
			: BigInt(notification.createdAt),
	);
	const timeAgo = createdAt
		? formatDistanceToNow(createdAt, { addSuffix: true, locale: dateLocale })
		: "";

	// Handle notification click
	const handleClick = useCallback(() => {
		// Mark as read if unread
		if (!notification.isRead && onMarkAsRead) {
			onMarkAsRead(notification.id);
		}

		// Navigate to action URL if available
		if (notification.actionUrl) {
			router.push(notification.actionUrl);
		}
	}, [
		notification.isRead,
		notification.id,
		notification.actionUrl,
		onMarkAsRead,
		router,
	]);

	// Handle delete
	const handleDelete = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			if (onDelete) {
				onDelete(notification.id);
			}
		},
		[notification.id, onDelete],
	);

	return (
		<Card
			className={`transition-colors ${
				!notification.isRead ? "border-primary/50 bg-primary/5" : ""
			} ${className || ""}`}
		>
			<CardContent className="p-4">
				<div className="flex gap-4">
					{/* Content */}
					<div className="flex-1 min-w-0 cursor-pointer" onClick={handleClick}>
						<div className="flex items-start gap-3 mb-2">
							<div className="flex flex-col gap-2 items-center">
								{notification.Sender?.image && (
									<Image
										src={notification.Sender.image || avatarPlaceholder}
										alt={notification.Sender.name || "User"}
										width={32}
										height={32}
										className="rounded-full shrink-0"
									/>
								)}

								{/* Unread Indicator */}
								<div className="pt-1 shrink-0">
									{notification.isRead ? (
										<span className="block w-2 h-2 rounded-full bg-muted" />
									) : (
										<span className="block w-2 h-2 rounded-full bg-primary" />
									)}
								</div>
							</div>

							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2 mb-1">
									<h4 className="text-sm font-semibold">
										{notification.subject}
									</h4>
									{notification.notificationType && (
										<Badge variant="outline" className="text-xs">
											{t(notification.notificationType) ||
												notification.notificationType}
										</Badge>
									)}
								</div>
								{notification.Store && (
									<p className="text-xs text-muted-foreground mb-1">
										{notification.Store.name}
									</p>
								)}
								<div
									className="text-sm text-muted-foreground line-clamp-2 mb-2"
									dangerouslySetInnerHTML={{
										__html: notification.message,
									}}
								/>
								<div className="flex items-center gap-4">
									<p className="text-xs text-muted-foreground">{timeAgo}</p>
									{notification.actionUrl && (
										<Button
											variant="link"
											size="sm"
											className="h-auto p-0 text-xs"
											onClick={(e) => {
												e.stopPropagation();
												router.push(notification.actionUrl!);
											}}
										>
											{t("view_details")}
										</Button>
									)}
								</div>
							</div>
						</div>
					</div>

					{/* Actions */}
					{showActions && (
						<div className="shrink-0">
							<Button
								variant="ghost"
								size="icon"
								onClick={handleDelete}
								className="h-8 w-8"
							>
								<IconTrash className="h-4 w-4" />
							</Button>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
