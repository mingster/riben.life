"use client";

import { getUserNotificationsAction } from "@/actions/user/notification/get-user-notifications";
import { markAllNotificationsReadAction } from "@/actions/user/notification/mark-all-notifications-read";
import { markNotificationReadAction } from "@/actions/user/notification/mark-notification-read";
import { useTranslation } from "@/app/i18n/client";
import { toastError, toastSuccess } from "@/components/toaster";
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
import { NotificationBell } from "./notification-bell";
import { NotificationCard } from "./notification-card";
import { IconLoader } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import useSWR from "swr";

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

	// Fetch notifications with SWR
	// Only refresh when popover is open to reduce unnecessary requests
	const { data, error, mutate, isLoading } = useSWR(
		session?.user ? "user-notifications" : null,
		fetcher,
		{
			refreshInterval: open ? 60000 : 0, // Refresh every 60 seconds only when open
			revalidateOnFocus: false, // Disable focus revalidation to reduce refreshes
			revalidateOnReconnect: true, // Still revalidate on reconnect
			dedupingInterval: 5000, // Dedupe requests within 5 seconds
		},
	);

	// Revalidate when popover opens
	useEffect(() => {
		if (open && session?.user) {
			mutate();
		}
	}, [open, mutate, session?.user]);

	const notifications = data?.notifications || [];
	const unreadCount = data?.unreadCount || 0;

	// Handle marking a notification as read with optimistic update
	const handleMarkAsRead = useCallback(
		async (notificationId: string) => {
			// Optimistic update: immediately update UI
			mutate(
				(currentData) => {
					if (!currentData) return currentData;
					return {
						...currentData,
						notifications: currentData.notifications.map((n) =>
							n.id === notificationId ? { ...n, isRead: true } : n,
						),
						unreadCount: Math.max(0, currentData.unreadCount - 1),
					};
				},
				{ revalidate: false }, // Don't revalidate immediately
			);

			// Then update on server
			const result = await markNotificationReadAction({ notificationId });
			if (result?.serverError) {
				toastError({ description: result.serverError });
				// Revert optimistic update on error
				mutate();
			} else {
				// Revalidate to ensure consistency
				mutate();
			}
		},
		[mutate],
	);

	// Handle marking all notifications as read with optimistic update
	const handleMarkAllAsRead = useCallback(async () => {
		// Optimistic update: immediately update UI
		mutate(
			(currentData) => {
				if (!currentData) return currentData;
				return {
					...currentData,
					notifications: currentData.notifications.map((n) => ({
						...n,
						isRead: true,
					})),
					unreadCount: 0,
				};
			},
			{ revalidate: false }, // Don't revalidate immediately
		);

		// Then update on server
		const result = await markAllNotificationsReadAction();
		if (result?.serverError) {
			toastError({ description: result.serverError });
			// Revert optimistic update on error
			mutate();
		} else {
			toastSuccess({ description: t("all_notifications_marked_read") });
			// Revalidate to ensure consistency
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
				<NotificationBell
					unreadCount={unreadCount}
					onOpen={() => setOpen(true)}
				/>
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
								{notifications.map((notification) => (
									<div key={notification.id} className="px-2 py-2">
										<NotificationCard
											notification={{
												id: notification.id,
												subject: notification.subject,
												message: notification.message,
												notificationType: notification.notificationType,
												actionUrl: notification.actionUrl,
												createdAt: notification.createdAt,
												isRead: notification.isRead,
												Sender: notification.Sender,
												Store: notification.Store,
											}}
											onMarkAsRead={handleMarkAsRead}
											showActions={false}
											className="border-0 shadow-none"
										/>
									</div>
								))}
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
