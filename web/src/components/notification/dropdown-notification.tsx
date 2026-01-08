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
import { useIsHydrated } from "@/hooks/use-hydrated";
import { NotificationBell } from "./notification-bell";
import { NotificationCard } from "./notification-card";
import { IconLoader } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import useSWR from "swr";

interface NotificationData {
	notifications: Array<{
		id: string;
		subject: string;
		message: string;
		notificationType: string | null;
		actionUrl: string | null;
		createdAt: number | bigint;
		isRead: boolean;
		Sender: {
			id: string;
			name: string | null;
			email: string | null;
			image: string | null;
		} | null;
		Store: {
			id: string;
			name: string | null;
		} | null;
	}>;
	totalCount: number;
	unreadCount: number;
}

// SWR fetcher function
const fetcher = async (): Promise<NotificationData> => {
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
	// Filter out notifications with missing required fields
	const data = result.data;
	if (data.notifications) {
		data.notifications = data.notifications.filter(
			(n) => n && n.id && (n.subject || n.message),
		);
	}
	return data;
};

export default function DropdownNotification() {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const isHydrated = useIsHydrated();
	const [open, setOpen] = useState(false);

	// Conditional key - set to null when conditions aren't met
	const swrKey =
		session?.user && isHydrated
			? ["user-notifications", session.user.id]
			: null;

	// Fetch notifications with SWR
	const { data, error, mutate, isLoading } = useSWR<NotificationData>(
		swrKey,
		fetcher,
		{
			refreshInterval: open ? 60000 : 0, // Refresh every 60 seconds only when open
			revalidateOnFocus: false, // Disable focus revalidation to reduce refreshes
			revalidateOnReconnect: true, // Still revalidate on reconnect
			dedupingInterval: 5000, // Dedupe requests within 5 seconds
		},
	);

	// Revalidate when popover opens
	const handleOpenChange = useCallback(
		(newOpen: boolean) => {
			setOpen(newOpen);
			if (newOpen && swrKey) {
				mutate();
			}
			console.log("handleOpenChange", newOpen);
		},
		[mutate, swrKey],
	);

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

	// Don't render until hydrated to prevent hydration mismatch
	if (!isHydrated) {
		return null;
	}

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<NotificationBell unreadCount={unreadCount} />
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
						{process.env.NODE_ENV === "development" && (
							<div className="mt-2 text-xs text-destructive">
								{error instanceof Error ? error.message : String(error)}
							</div>
						)}
					</div>
				) : notifications.length === 0 ? (
					<div className="px-4 py-8 text-center text-sm text-muted-foreground">
						{t("no_notifications")}
						{process.env.NODE_ENV === "development" && unreadCount > 0 && (
							<div className="mt-2 text-xs text-destructive">
								Debug: unreadCount={unreadCount} but notifications.length=0
							</div>
						)}
					</div>
				) : (
					<>
						<ScrollArea className="h-[400px]">
							<div className="divide-y">
								{notifications.map((notification) => {
									// Ensure createdAt is properly formatted (number or bigint)
									const createdAt =
										typeof notification.createdAt === "bigint"
											? notification.createdAt
											: typeof notification.createdAt === "number"
												? notification.createdAt
												: Number(notification.createdAt) || 0;

									return (
										<div key={notification.id} className="px-2 py-2">
											<NotificationCard
												notification={{
													id: notification.id,
													subject: notification.subject || "",
													message: notification.message || "",
													notificationType: notification.notificationType,
													actionUrl: notification.actionUrl,
													createdAt,
													isRead: notification.isRead || false,
													Sender: notification.Sender || null,
													Store: notification.Store || null,
												}}
												onMarkAsRead={handleMarkAsRead}
												showActions={false}
												className="border-0 shadow-none"
											/>
										</div>
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
