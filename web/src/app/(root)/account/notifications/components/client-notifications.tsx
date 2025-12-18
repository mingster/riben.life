"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { Heading } from "@/components/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toastError, toastSuccess } from "@/components/toaster";
import { markNotificationReadAction } from "@/actions/user/notification/mark-notification-read";
import { markAllNotificationsReadAction } from "@/actions/user/notification/mark-all-notifications-read";
import { deleteNotificationAction } from "@/actions/user/notification/delete-notification";
import { bulkDeleteNotificationsAction } from "@/actions/user/notification/bulk-delete-notifications";
import {
	IconLoader,
	IconTrash,
	IconSettings,
	IconCheck,
} from "@tabler/icons-react";
import { AlertModal } from "@/components/modals/alert-modal";
import { NotificationCard } from "@/components/notification/notification-card";
import type { MessageQueue } from "@prisma/client";

interface NotificationWithRelations extends MessageQueue {
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
}

interface ClientNotificationsProps {
	initialNotifications: NotificationWithRelations[];
}

const notificationTypeLabels: Record<string, string> = {
	order: "order",
	reservation: "reservation",
	credit: "credit",
	payment: "payment",
	system: "system",
	marketing: "marketing",
};

export function ClientNotifications({
	initialNotifications,
}: ClientNotificationsProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const router = useRouter();

	const [notifications, setNotifications] =
		useState<NotificationWithRelations[]>(initialNotifications);
	const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">(
		"all",
	);
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [loading, setLoading] = useState(false);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);

	// Filter notifications
	const filteredNotifications = useMemo(() => {
		return notifications.filter((notification) => {
			// Status filter
			if (statusFilter === "unread" && notification.isRead) return false;
			if (statusFilter === "read" && !notification.isRead) return false;

			// Type filter
			if (typeFilter !== "all" && notification.notificationType !== typeFilter)
				return false;

			return true;
		});
	}, [notifications, statusFilter, typeFilter]);

	// Handle marking notification as read
	const handleMarkAsRead = useCallback(async (notificationId: string) => {
		const result = await markNotificationReadAction({ notificationId });
		if (result?.serverError) {
			toastError({ description: result.serverError });
		} else {
			setNotifications((prev) =>
				prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
			);
		}
	}, []);

	// Handle marking all as read
	const handleMarkAllAsRead = useCallback(async () => {
		setLoading(true);
		try {
			const result = await markAllNotificationsReadAction();
			if (result?.serverError) {
				toastError({ description: result.serverError });
			} else {
				setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
				setSelectedIds(new Set());
				toastSuccess({ description: t("all_notifications_marked_read") });
			}
		} catch (error: any) {
			toastError({
				description: error?.message || t("failed_to_mark_all_read"),
			});
		} finally {
			setLoading(false);
		}
	}, [t]);

	// Handle deleting notification
	const handleDelete = useCallback(
		async (notificationId: string) => {
			setLoading(true);
			try {
				const result = await deleteNotificationAction({ notificationId });
				if (result?.serverError) {
					toastError({ description: result.serverError });
				} else {
					setNotifications((prev) =>
						prev.filter((n) => n.id !== notificationId),
					);
					setSelectedIds((prev) => {
						const next = new Set(prev);
						next.delete(notificationId);
						return next;
					});
					toastSuccess({ description: t("notification_deleted") });
				}
			} catch (error: any) {
				toastError({
					description: error?.message || t("failed_to_delete_notification"),
				});
			} finally {
				setLoading(false);
			}
		},
		[t],
	);

	// Handle bulk delete
	const handleBulkDelete = useCallback(async () => {
		if (selectedIds.size === 0) return;

		setLoading(true);
		try {
			const result = await bulkDeleteNotificationsAction({
				notificationIds: Array.from(selectedIds),
			});
			if (result?.serverError) {
				toastError({ description: result.serverError });
			} else {
				setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
				setSelectedIds(new Set());
				toastSuccess({
					description: t("notifications_deleted", {
						count: selectedIds.size,
					}),
				});
				setDeleteModalOpen(false);
			}
		} catch (error: any) {
			toastError({
				description: error?.message || t("failed_to_delete_notifications"),
			});
		} finally {
			setLoading(false);
		}
	}, [selectedIds, t]);

	// Handle notification click
	const handleNotificationClick = useCallback(
		async (notification: NotificationWithRelations) => {
			// Mark as read if unread
			if (!notification.isRead) {
				await handleMarkAsRead(notification.id);
			}

			// Navigate to action URL if available
			if (notification.actionUrl) {
				router.push(notification.actionUrl);
			}
		},
		[handleMarkAsRead, router],
	);

	// Toggle selection
	const toggleSelection = useCallback((notificationId: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(notificationId)) {
				next.delete(notificationId);
			} else {
				next.add(notificationId);
			}
			return next;
		});
	}, []);

	// Toggle select all
	const toggleSelectAll = useCallback(() => {
		if (selectedIds.size === filteredNotifications.length) {
			setSelectedIds(new Set());
		} else {
			setSelectedIds(new Set(filteredNotifications.map((n) => n.id)));
		}
	}, [selectedIds.size, filteredNotifications]);

	const unreadCount = notifications.filter((n) => !n.isRead).length;

	return (
		<div className="space-y-6">
			<AlertModal
				isOpen={deleteModalOpen}
				onClose={() => setDeleteModalOpen(false)}
				onConfirm={handleBulkDelete}
				loading={loading}
			/>

			<div className="flex items-center justify-between">
				<Heading
					title={t("notifications")}
					description={t("notification_center_description")}
				/>
				<Link href="/account/notifications/preferences">
					<Button variant="outline" size="sm">
						<IconSettings className="mr-2 h-4 w-4" />
						{t("settings")}
					</Button>
				</Link>
			</div>

			<Separator />

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-4">
				<Select
					value={statusFilter}
					onValueChange={(v) => setStatusFilter(v as any)}
				>
					<SelectTrigger className="w-[150px]">
						<SelectValue placeholder={t("filter_by_status")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("all_statuses")}</SelectItem>
						<SelectItem value="unread">
							{t("unread")} ({unreadCount})
						</SelectItem>
						<SelectItem value="read">{t("read")}</SelectItem>
					</SelectContent>
				</Select>

				<Select value={typeFilter} onValueChange={setTypeFilter}>
					<SelectTrigger className="w-[150px]">
						<SelectValue placeholder={t("filter_by_type")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("all_types")}</SelectItem>
						{Object.entries(notificationTypeLabels).map(([value, key]) => (
							<SelectItem key={value} value={value}>
								{t(key)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<div className="flex-1" />

				{selectedIds.size > 0 && (
					<>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setDeleteModalOpen(true)}
							disabled={loading}
						>
							<IconTrash className="mr-2 h-4 w-4" />
							{t("delete_selected")} ({selectedIds.size})
						</Button>
					</>
				)}

				{unreadCount > 0 && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleMarkAllAsRead}
						disabled={loading}
					>
						{loading ? (
							<>
								<IconLoader className="mr-2 h-4 w-4 animate-spin" />
								{t("marking_all_read")}
							</>
						) : (
							<>
								<IconCheck className="mr-2 h-4 w-4" />
								{t("mark_all_as_read")}
							</>
						)}
					</Button>
				)}
			</div>

			{/* Notifications List */}
			{filteredNotifications.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center">
						<p className="text-muted-foreground">
							{t("no_notifications_found")}
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-4">
					{/* Select All Checkbox */}
					<div className="flex items-center gap-2 px-2">
						<Checkbox
							checked={
								filteredNotifications.length > 0 &&
								selectedIds.size === filteredNotifications.length
							}
							onCheckedChange={toggleSelectAll}
						/>
						<span className="text-sm text-muted-foreground">
							{t("select_all")}
						</span>
					</div>

					{filteredNotifications.map((notification) => (
						<div
							key={notification.id}
							className={`relative ${selectedIds.has(notification.id) ? "ring-2 ring-primary rounded-md" : ""}`}
						>
							{/* Checkbox overlay */}
							<div className="absolute left-2 top-2 z-10">
								<Checkbox
									checked={selectedIds.has(notification.id)}
									onCheckedChange={() => toggleSelection(notification.id)}
									onClick={(e) => e.stopPropagation()}
								/>
							</div>

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
								onDelete={handleDelete}
								showActions={true}
								className={selectedIds.has(notification.id) ? "ring-0" : ""}
							/>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
