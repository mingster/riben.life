"use client";

import { useState, useMemo, useCallback } from "react";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { DataTableCheckbox } from "@/components/dataTable-checkbox";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Heading } from "@/components/heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	IconDots,
	IconLoader,
	IconTrash,
	IconDownload,
} from "@tabler/icons-react";
import { formatDateTime, epochToDate } from "@/utils/datetime-utils";
import { toastError, toastSuccess } from "@/components/toaster";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { ChannelStatusBadge } from "@/components/notification/channel-status-badge";
import type { MessageQueue } from "@prisma/client";

interface MessageQueueWithDelivery extends MessageQueue {
	Sender?: {
		id: string;
		name: string | null;
		email: string | null;
	} | null;
	Recipient?: {
		id: string;
		name: string | null;
		email: string | null;
	} | null;
	DeliveryStatuses?: Array<{
		id: string;
		channel: string;
		status: string;
		deliveredAt: number | bigint | null;
		readAt: number | bigint | null;
		errorMessage: string | null;
		createdAt: number | bigint;
		updatedAt: number | bigint;
	}>;
}

interface ClientHistoryProps {
	storeId: string;
	initialData: MessageQueueWithDelivery[];
}

const overallStatusClasses: Record<string, string> = {
	pending: "bg-gray-500",
	sent: "bg-blue-500",
	delivered: "bg-green-500",
	read: "bg-green-600",
	failed: "bg-red-500",
	bounced: "bg-orange-500",
};

const overallStatusLabels: Record<string, string> = {
	pending: "Pending",
	sent: "Sent",
	delivered: "Delivered",
	read: "Read",
	failed: "Failed",
	bounced: "Bounced",
};

// Used only for filter dropdown labels (badge rendering uses ChannelStatusBadge)
const channelFilterLabels: Record<string, string> = {
	onsite: "On-Site",
	email: "Email",
	line: "LINE",
	whatsapp: "WhatsApp",
	wechat: "WeChat",
	sms: "SMS",
	telegram: "Telegram",
	push: "Push",
};

const notificationTypeLabels: Record<string, string> = {
	order: "Order",
	reservation: "Reservation",
	credit: "Credit",
	payment: "Payment",
	system: "System",
	marketing: "Marketing",
};

export function ClientHistory({ storeId, initialData }: ClientHistoryProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const [data, setData] = useState<MessageQueueWithDelivery[]>(initialData);
	const [loading, setLoading] = useState(false);
	const [selectedRows, setSelectedRows] = useState<RowSelectionState>({});
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	// Filters
	const [recipientSearch, setRecipientSearch] = useState("");
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [channelFilter, setChannelFilter] = useState<string>("all");
	const [dateFrom, setDateFrom] = useState<string>("");
	const [dateTo, setDateTo] = useState<string>("");

	// Memoize filter change handlers to prevent infinite re-renders
	const handleTypeFilterChange = useCallback((value: string) => {
		setTypeFilter(value);
	}, []);

	const handleStatusFilterChange = useCallback((value: string) => {
		setStatusFilter(value);
	}, []);

	const handleChannelFilterChange = useCallback((value: string) => {
		setChannelFilter(value);
	}, []);

	const handleDeleted = useCallback(
		(deletedItem: MessageQueueWithDelivery) => {
			setData((prev) => prev.filter((item) => item.id !== deletedItem.id));
			toastSuccess({ description: t("notification_deleted") });
		},
		[t],
	);

	const getOverallStatus = useCallback((item: MessageQueueWithDelivery) => {
		if (!item.DeliveryStatuses || item.DeliveryStatuses.length === 0) {
			return item.sentOn ? "sent" : "pending";
		}
		// Get the worst status (failed > pending > sent > delivered > read)
		const statuses = item.DeliveryStatuses.map((s) => s.status);
		if (statuses.includes("failed") || statuses.includes("bounced")) {
			return "failed";
		}
		if (statuses.includes("pending")) {
			return "pending";
		}
		if (statuses.includes("read")) {
			return "read";
		}
		if (statuses.includes("delivered")) {
			return "delivered";
		}
		return "sent";
	}, []);

	const filteredData = useMemo(() => {
		return data.filter((item) => {
			// Recipient search
			if (recipientSearch) {
				const recipient = item.Recipient;
				const searchLower = recipientSearch.toLowerCase();
				const matchesRecipient =
					recipient?.name?.toLowerCase().includes(searchLower) ||
					recipient?.email?.toLowerCase().includes(searchLower) ||
					recipient?.id?.toLowerCase().includes(searchLower);
				if (!matchesRecipient) return false;
			}

			// Type filter
			if (typeFilter !== "all" && item.notificationType !== typeFilter) {
				return false;
			}

			// Status filter
			if (statusFilter !== "all") {
				const overallStatus = getOverallStatus(item);
				if (overallStatus !== statusFilter) return false;
			}

			// Channel filter
			if (channelFilter !== "all") {
				const hasChannel =
					item.DeliveryStatuses?.some((s) => s.channel === channelFilter) ||
					false;
				if (!hasChannel) return false;
			}

			// Date range filter
			if (dateFrom || dateTo) {
				const createdAt = Number(item.createdAt);
				if (dateFrom) {
					const fromDate = new Date(dateFrom).getTime();
					if (createdAt < fromDate) return false;
				}
				if (dateTo) {
					const toDate = new Date(dateTo).getTime() + 86400000; // Add 1 day to include the entire day
					if (createdAt >= toDate) return false;
				}
			}

			return true;
		});
	}, [
		data,
		recipientSearch,
		typeFilter,
		statusFilter,
		channelFilter,
		dateFrom,
		dateTo,
		getOverallStatus,
	]);

	const exportToCSV = useCallback(() => {
		const headers = [
			"Date/Time",
			"Recipient",
			"Subject",
			"Type",
			"Channels",
			"Status",
		];
		const rows = filteredData.map((item) => {
			const createdAt = epochToDate(BigInt(item.createdAt));
			const dateTime = createdAt ? formatDateTime(createdAt) : "";
			const recipient = item.Recipient
				? item.Recipient.name || item.Recipient.email || item.Recipient.id
				: "";
			const channels =
				item.DeliveryStatuses?.map((s) => s.channel).join(", ") || "";
			const status = getOverallStatus(item);

			return [
				dateTime,
				recipient,
				item.subject || "",
				item.notificationType || "",
				channels,
				status,
			];
		});

		const csvContent = [
			headers.join(","),
			...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
		].join("\n");

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute("download", `notification-history-${Date.now()}.csv`);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		toastSuccess({ description: t("exported_to_csv") });
	}, [filteredData, getOverallStatus, t]);

	const deleteSelected = useCallback(async () => {
		if (selectedIds.length === 0) return;

		setLoading(true);
		try {
			// Delete via API
			const deletePromises = selectedIds.map((id) =>
				fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${storeId}/messageQueue/${id}`,
					{
						method: "DELETE",
					},
				),
			);

			await Promise.all(deletePromises);

			setData((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
			setSelectedRows({});
			setSelectedIds([]);
			toastSuccess({
				description: t("notifications_deleted", { count: selectedIds.length }),
			});
		} catch (error: any) {
			toastError({
				description: error?.message || t("failed_to_delete_notifications"),
			});
		} finally {
			setLoading(false);
		}
	}, [selectedIds, storeId, t]);

	const columns: ColumnDef<MessageQueueWithDelivery>[] = useMemo(
		() => [
			{
				id: "select",
				accessorKey: "id",
				header: ({ table }) => (
					<Checkbox
						checked={
							table.getIsAllPageRowsSelected() ||
							(table.getIsSomePageRowsSelected() && "indeterminate")
						}
						onCheckedChange={(selectAll) => {
							if (selectAll) {
								const allRows = table.getRowModel().rows;
								const allIds = allRows.map((row) => row.original.id);
								setSelectedIds(allIds);
							} else {
								setSelectedIds([]);
							}
							table.toggleAllPageRowsSelected(!!selectAll);
						}}
						aria-label="Select all"
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={(isChecked) => {
							row.toggleSelected(!!isChecked);
							if (isChecked) {
								setSelectedIds((prev) => [...prev, row.original.id]);
							} else {
								setSelectedIds((prev) =>
									prev.filter((id) => id !== row.original.id),
								);
							}
						}}
						aria-label="Select row"
					/>
				),
				enableSorting: false,
				enableHiding: false,
			},
			{
				accessorKey: "createdAt",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("date_time")} />
				),
				cell: ({ row }) => {
					const createdAt = epochToDate(BigInt(row.getValue("createdAt")));
					return (
						<div className="text-sm">
							{createdAt ? formatDateTime(createdAt) : "-"}
						</div>
					);
				},
			},
			{
				accessorKey: "recipientId",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("recipient")} />
				),
				cell: ({ row }) => {
					const recipient = row.original.Recipient;
					return (
						<div className="text-sm">
							{recipient?.name ||
								recipient?.email ||
								row.getValue("recipientId")}
						</div>
					);
				},
			},
			{
				accessorKey: "subject",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("subject")} />
				),
				cell: ({ row }) => (
					<div className="max-w-[300px] truncate text-sm">
						{row.getValue("subject")}
					</div>
				),
			},
			{
				accessorKey: "notificationType",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("type")} />
				),
				cell: ({ row }) => {
					const type = row.getValue("notificationType") as string | null;
					return <Badge variant="outline">{type ? t(type) : "-"}</Badge>;
				},
			},
			{
				id: "channels",
				header: t("channels"),
				cell: ({ row }) => {
					const statuses = row.original.DeliveryStatuses || [];
					if (statuses.length === 0) {
						return <span className="text-muted-foreground text-sm">-</span>;
					}
					return (
						<div className="flex flex-wrap gap-1">
							{statuses.map((status) => (
								<ChannelStatusBadge
									key={status.id}
									channel={status.channel as any}
									status={status.status as any}
									size="sm"
									errorMessage={status.errorMessage}
									deliveredAt={status.deliveredAt}
									readAt={status.readAt}
									createdAt={status.createdAt}
									updatedAt={status.updatedAt}
								/>
							))}
						</div>
					);
				},
			},
			{
				id: "status",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("status")} />
				),
				cell: ({ row }) => {
					const overallStatus = getOverallStatus(row.original);
					return (
						<Badge
							variant="secondary"
							className={`${
								overallStatusClasses[overallStatus] || "bg-gray-500"
							} text-white`}
						>
							{overallStatusLabels[overallStatus] || overallStatus}
						</Badge>
					);
				},
			},
			{
				id: "actions",
				cell: ({ row }) => (
					<CellAction
						item={row.original}
						storeId={storeId}
						onDeleted={handleDeleted}
					/>
				),
			},
		],
		[t, getOverallStatus, handleDeleted],
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<Heading
					title={t("notification_history")}
					description={t("notification_history_descr")}
					badge={filteredData.length}
				/>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						onClick={exportToCSV}
						disabled={filteredData.length === 0}
					>
						<IconDownload className="mr-2 h-4 w-4" />
						{t("export_csv")}
					</Button>
					{selectedIds.length > 0 && (
						<Button
							variant="destructive"
							onClick={deleteSelected}
							disabled={loading}
						>
							{loading ? (
								<>
									<IconLoader className="mr-2 h-4 w-4 animate-spin" />
									{t("deleting")}
								</>
							) : (
								<>
									<IconTrash className="mr-2 h-4 w-4" />
									{t("delete_selected")}
								</>
							)}
						</Button>
					)}
				</div>
			</div>

			{/* Filters */}
			<div className="grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-2 lg:grid-cols-3">
				<Input
					placeholder={t("search_recipient")}
					value={recipientSearch}
					onChange={(e) => setRecipientSearch(e.target.value)}
					className="max-w-sm"
				/>

				<Select value={typeFilter} onValueChange={handleTypeFilterChange}>
					<SelectTrigger className="max-w-sm">
						<SelectValue placeholder={t("filter_by_type")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("all_types")}</SelectItem>
						{Object.entries(notificationTypeLabels).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{t(value)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={statusFilter} onValueChange={handleStatusFilterChange}>
					<SelectTrigger className="max-w-sm">
						<SelectValue placeholder={t("filter_by_status")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("all_statuses")}</SelectItem>
						{Object.entries(overallStatusLabels).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={channelFilter} onValueChange={handleChannelFilterChange}>
					<SelectTrigger className="max-w-sm">
						<SelectValue placeholder={t("filter_by_channel")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("all_channels")}</SelectItem>
						{Object.entries(channelFilterLabels).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Input
					type="date"
					placeholder={t("date_from")}
					value={dateFrom}
					onChange={(e) => setDateFrom(e.target.value)}
					className="max-w-sm"
				/>

				<Input
					type="date"
					placeholder={t("date_to")}
					value={dateTo}
					onChange={(e) => setDateTo(e.target.value)}
					className="max-w-sm"
				/>
			</div>

			<DataTableCheckbox
				columns={columns}
				data={filteredData}
				initiallySelected={selectedRows}
				disabled={loading}
				onRowSelectionChange={(rows) => {
					setSelectedRows(rows);
					// Update selectedIds based on row selection
					const ids: string[] = [];
					Object.keys(rows).forEach((rowIndex) => {
						if (rows[rowIndex]) {
							const row = filteredData[parseInt(rowIndex, 10)];
							if (row) {
								ids.push(row.id);
							}
						}
					});
					setSelectedIds(ids);
				}}
				noPagination={false}
				defaultPageSize={30}
			/>
		</div>
	);
}

interface CellActionProps {
	item: MessageQueueWithDelivery;
	storeId: string;
	onDeleted: (item: MessageQueueWithDelivery) => void;
}

function CellAction({ item, storeId, onDeleted }: CellActionProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");
	const [loading, setLoading] = useState(false);

	const handleDelete = useCallback(async () => {
		setLoading(true);
		try {
			await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${storeId}/messageQueue/${item.id}`,
				{
					method: "DELETE",
				},
			);
			onDeleted(item);
		} catch (error: any) {
			toastError({
				description: error?.message || t("failed_to_delete_notification"),
			});
		} finally {
			setLoading(false);
		}
	}, [item, storeId, onDeleted, t]);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" disabled={loading}>
					{loading ? (
						<IconLoader className="h-4 w-4 animate-spin" />
					) : (
						<IconDots className="h-4 w-4" />
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleDelete} className="text-destructive">
					<IconTrash className="mr-2 h-4 w-4" />
					{t("delete")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
