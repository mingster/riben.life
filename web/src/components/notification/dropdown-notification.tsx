"use client";

import { getUserNotificationsAction } from "@/actions/user/notification/get-user-notifications";
import { markAllNotificationsReadAction } from "@/actions/user/notification/mark-all-notifications-read";
import { markNotificationReadAction } from "@/actions/user/notification/mark-notification-read";
import { useTranslation } from "@/app/i18n/client";
import { toastError, toastSuccess } from "@/components/toaster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/providers/i18n-provider";
import { epochToDate } from "@/utils/datetime-utils";
import { IconBell, IconLoader } from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import useSWR from "swr";

const avatarPlaceholder = "/images/user/avatar_placeholder.png";

// SWR fetcher function
const fetcher = async () => {
	const result = await getUserNotificationsAction({ limit: 20, offset: 0 });
	if (!result) {
		throw new Error("Failed to fetch notifications");
	}
	if (result.serverError) {
		throw new Error(result.serverError);
	}
	if (!result.data) {
		throw new Error("No data returned");
	}
	return result.data;
};

export default function DropdownNotification() {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const [open, setOpen] = useState(false);

	// Fetch notifications with SWR (auto-refresh every 30 seconds)
	const { data, error, mutate, isLoading } = useSWR(
		session?.user ? "user-notifications" : null,
		fetcher,
		{
			refreshInterval: 30000, // Refresh every 30 seconds
			revalidateOnFocus: true,
		},
	);

	const notifications = data?.notifications || [];
	const unreadCount = data?.unreadCount || 0;

	// Handle marking a notification as read
	const handleMarkAsRead = useCallback(
		async (notificationId: string) => {
			const result = await markNotificationReadAction({ notificationId });
			if (result?.serverError) {
				toastError({ description: result.serverError });
			} else {
				// Refresh the notifications list
				mutate();
			}
		},
		[mutate],
	);

	// Handle marking all notifications as read
	const handleMarkAllAsRead = useCallback(async () => {
		const result = await markAllNotificationsReadAction();
		if (result?.serverError) {
			toastError({ description: result.serverError });
		} else {
			toastSuccess({ description: t("all_notifications_marked_read") });
			// Refresh the notifications list
			mutate();
		}
	}, [mutate, t]);

	// Handle notification click
	const handleNotificationClick = useCallback(
		async (notification: (typeof notifications)[0]) => {
			// Mark as read if unread
			if (!notification.isRead) {
				await handleMarkAsRead(notification.id);
			}

			// Navigate to action URL if available, otherwise to notification center
			if (notification.actionUrl) {
				router.push(notification.actionUrl);
			} else {
				router.push("/account/notifications");
			}

			setOpen(false);
		},
		[handleMarkAsRead, router],
	);

	// Don't render if user is not authenticated
	if (!session?.user) {
		return null;
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="relative h-10 w-10 min-h-[44px] min-w-[44px] sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0"
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
			</PopoverTrigger>
			<PopoverContent
				className="w-[calc(100vw-2rem)] sm:w-[400px] p-0"
				align="end"
			>
				<div className="flex items-center justify-between px-4 py-3 border-b">
					<h3 className="font-semibold text-sm">{t("notifications")}</h3>
					<Link
						href="/account/notifications"
						onClick={() => setOpen(false)}
						className="text-xs text-primary hover:underline"
					>
						{t("view_all")}
					</Link>
				</div>

				{isLoading ? (
					<div className="flex items-center justify-center py-8">
						<IconLoader className="h-5 w-5 animate-spin" />
					</div>
				) : error ? (
					<div className="px-4 py-8 text-center text-sm text-muted-foreground">
						{t("failed_to_load_notifications")}
					</div>
				) : notifications.length === 0 ? (
					<div className="px-4 py-8 text-center text-sm text-muted-foreground">
						{t("no_notifications")}
					</div>
				) : (
					<>
						<ScrollArea className="h-[400px]">
							<div className="divide-y">
								{notifications.map((notification) => {
									const createdAt = epochToDate(BigInt(notification.createdAt));
									const timeAgo = createdAt
										? formatDistanceToNow(createdAt, { addSuffix: true })
										: "";

									return (
										<button
											key={notification.id}
											onClick={() => handleNotificationClick(notification)}
											className="w-full text-left px-4 py-3 hover:bg-accent transition-colors"
										>
											<div className="flex gap-3">
												{/* Unread indicator */}
												<div className="shrink-0 pt-1">
													{notification.isRead ? (
														<span className="block w-2 h-2 rounded-full bg-muted" />
													) : (
														<span className="block w-2 h-2 rounded-full bg-primary" />
													)}
												</div>

												{/* Notification content */}
												<div className="flex-1 min-w-0">
													<div className="flex items-start gap-2 mb-1">
														{notification.Sender?.image && (
															<Image
																src={
																	notification.Sender.image || avatarPlaceholder
																}
																alt={notification.Sender.name || "User"}
																width={24}
																height={24}
																className="rounded-full shrink-0"
															/>
														)}
														<div className="flex-1 min-w-0">
															<p className="text-sm font-medium truncate">
																{notification.subject}
															</p>
															{notification.Store && (
																<p className="text-xs text-muted-foreground truncate">
																	{notification.Store.name}
																</p>
															)}
														</div>
													</div>
													<p className="text-sm text-muted-foreground line-clamp-2 mb-1">
														{notification.message}
													</p>
													<p className="text-xs text-muted-foreground">
														{timeAgo}
													</p>
												</div>
											</div>
										</button>
									);
								})}
							</div>
						</ScrollArea>

						{unreadCount > 0 && (
							<>
								<Separator />
								<div className="px-4 py-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={handleMarkAllAsRead}
										className="w-full text-xs"
									>
										{t("mark_all_as_read")}
									</Button>
								</div>
							</>
						)}
					</>
				)}
			</PopoverContent>
		</Popover>
	);
}
