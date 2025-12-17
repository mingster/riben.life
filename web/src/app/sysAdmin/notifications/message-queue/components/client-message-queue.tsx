"use client";

import { IconCopy, IconDots, IconLoader, IconTrash } from "@tabler/icons-react";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import axios, { type AxiosError } from "axios";
import { useEffect, useState } from "react";
import { DataTableCheckbox } from "@/components/dataTable-checkbox";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Heading } from "@/components/heading";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MessageQueue } from "@/types";
import { formatDateTime, getUtcNow } from "@/utils/datetime-utils";
import { EditMessageQueue } from "./edit-message-queue";
import { Loader } from "@/components/loader";
import { format } from "date-fns";
import Link from "next/link";
import logger from "@/lib/logger";

// MessageQueueAdminPage provides the following features:
// 1. review the message queue in the table
// 2. view message details
// 3. delete selected messages in queue
export default function MessageQueueAdminClient({
	initialData = [],
	stores = [],
	users = [],
}: {
	initialData?: MessageQueue[];
	stores?: Array<{ id: string; name: string | null }>;
	users?: Array<{ id: string; name: string | null; email: string | null }>;
}) {
	const [messageQueueData, setMessageQueueData] =
		useState<MessageQueue[]>(initialData);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [currentTime, setCurrentTime] = useState(() => getUtcNow());
	const [openDeleteSelectedMessages, setOpenDeleteSelectedMessages] =
		useState(false);
	const [selectedRows, setSelectedRows] = useState<RowSelectionState>({});
	const [selectedMessageQueueIds, setSelectedMessageQueueIds] = useState<
		string[]
	>([]);

	const handleUpdated = (updatedVal: MessageQueue) => {
		setMessageQueueData((prev) =>
			prev.map((obj) =>
				obj.id === updatedVal.id
					? ({
							...updatedVal,
							sendTries: updatedVal.sendTries ?? 0,
							sentOn: updatedVal.sentOn ?? null,
							isRead: updatedVal.isRead ?? false,
							isDeletedByAuthor: updatedVal.isDeletedByAuthor ?? false,
							isDeletedByRecipient: updatedVal.isDeletedByRecipient ?? false,
						} as MessageQueue)
					: obj,
			),
		);
		logger.info("handleUpdated");
	};

	const handleDeleted = (deletedVal: MessageQueue) => {
		setMessageQueueData((prev) =>
			prev.filter((obj) => obj.id !== deletedVal.id),
		);
		logger.info("handleDeleted");
	};

	const columns: ColumnDef<MessageQueue>[] = [
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
							setSelectedMessageQueueIds(allIds);
						} else {
							setSelectedMessageQueueIds([]);
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
							setSelectedMessageQueueIds([
								...selectedMessageQueueIds,
								row.original.id,
							]);
						} else {
							setSelectedMessageQueueIds(
								selectedMessageQueueIds.filter((id) => id !== row.original.id),
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
			accessorKey: "senderId",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="Sender" />;
			},
			cell: ({ row }) => {
				const sender = row.original.Sender;
				return (
					<div className="flex items-center gap-2">
						<Link href={`/sysAdmin/users/${row.getValue("senderId")}`}>
							{sender?.name || sender?.email || row.getValue("senderId")}
						</Link>
					</div>
				);
			},
		},
		{
			accessorKey: "recipientId",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="Recipient" />;
			},
			cell: ({ row }) => {
				const recipient = row.original.Recipient;
				return (
					<div className="flex items-center gap-2">
						<Link href={`/sysAdmin/users/${row.getValue("recipientId")}`}>
							{recipient?.name ||
								recipient?.email ||
								row.getValue("recipientId")}
						</Link>
					</div>
				);
			},
		},
		{
			accessorKey: "subject",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="Subject" />;
			},
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					{row.getValue("subject")}
					<EditMessageQueue
						item={row.original}
						onUpdated={handleUpdated}
						stores={stores}
						users={users}
					/>
				</div>
			),
		},
		{
			accessorKey: "notificationType",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="Type" />;
			},
			cell: ({ row }) => {
				const type = row.getValue("notificationType") as string | null;
				return <div>{type || "-"}</div>;
			},
		},
		{
			accessorKey: "priority",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="Priority" />;
			},
			cell: ({ row }) => {
				const priority = row.getValue("priority") as number;
				const labels = ["Normal", "High", "Urgent"];
				return <div>{labels[priority] || priority}</div>;
			},
		},
		{
			accessorKey: "isRead",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="Read" />;
			},
			cell: ({ row }) => {
				const isRead = row.getValue("isRead") as boolean;
				return <div>{isRead ? "✓" : "✗"}</div>;
			},
		},
		{
			accessorKey: "storeId",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="Store" />;
			},
			cell: ({ row }) => {
				const storeId = row.getValue("storeId") as string | null;
				if (!storeId) return <div>-</div>;
				const store = stores.find((s) => s.id === storeId);
				return <div>{store?.name || storeId}</div>;
			},
		},
		{
			accessorKey: "createdAt",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="Created" />;
			},
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					{formatDateTime(row.getValue("createdAt"))}
				</div>
			),
		},
		{
			accessorKey: "sentOn",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="Sent" />;
			},
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					{row.getValue("sentOn")
						? formatDateTime(row.getValue("sentOn"))
						: "-"}
				</div>
			),
		},
		{
			id: "actions",
			cell: ({ row }) => (
				<CellAction item={row.original} onUpdated={handleDeleted} />
			),
		},
	];

	const CellAction: React.FC<CellActionProps> = ({ item, onUpdated }) => {
		const [loading, setLoading] = useState(false);
		const [open, setOpen] = useState(false);

		const onConfirm = async () => {
			try {
				setLoading(true);
				await axios.delete(
					`${process.env.NEXT_PUBLIC_API_URL}/sysAdmin/messageQueue/${item.id}`,
				);
				toastSuccess({
					title: "Message deleted",
					description: "",
				});
			} catch (error: unknown) {
				const err = error as AxiosError;
				toastError({
					title: "Something went wrong.",
					description: err.message,
				});
			} finally {
				setLoading(false);
				setOpen(false);
				handleDeleted(item);
			}
		};

		const onCopy = (id: string) => {
			navigator.clipboard.writeText(id);
			toastSuccess({
				title: "ID copied to clipboard.",
				description: "",
			});
		};

		return (
			<>
				<AlertModal
					isOpen={open}
					onClose={() => setOpen(false)}
					onConfirm={onConfirm}
					loading={loading}
				/>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="size-8 p-0">
							<span className="sr-only">Open menu</span>
							<IconDots className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						<DropdownMenuItem onClick={() => onCopy(item.id)}>
							<IconCopy className="mr-0 size-4" /> Copy Id
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setOpen(true)}>
							<IconTrash className="mr-0 size-4" /> Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</>
		);
	};

	const deleteSelectedMessages = async () => {
		if (selectedMessageQueueIds.length === 0) {
			toastError({
				title: "No messages selected",
				description: "Please select at least one message to delete",
			});
			return;
		}

		setLoading(true);
		logger.info("deleteSelectedMessages");
		for (const id of selectedMessageQueueIds) {
			try {
				await axios.delete(
					`${process.env.NEXT_PUBLIC_API_URL}/sysAdmin/messageQueue/${id}`,
				);
				const item = messageQueueData.find((m) => m.id === id);
				if (item) {
					handleDeleted(item);
				}
			} catch (error: unknown) {
				const err = error as AxiosError;
				toastError({
					title: "Something went wrong.",
					description: err.message,
				});
			}
		}

		toastSuccess({
			title: "Messages deleted",
			description: "Messages deleted successfully",
		});

		setSelectedRows({});
		setSelectedMessageQueueIds([]);
		setLoading(false);
		setOpenDeleteSelectedMessages(false);
	};

	// Clear selectedMessageQueueIds when selectedRows is cleared
	useEffect(() => {
		if (Object.keys(selectedRows).length === 0) {
			setSelectedMessageQueueIds([]);
		}
	}, [selectedRows]);

	// Update current time every 10 seconds
	useEffect(() => {
		const timerId = setInterval(() => {
			setCurrentTime(getUtcNow());
		}, 10000);

		return () => {
			clearInterval(timerId);
		};
	}, []);

	if (loading) return <Loader />;
	if (error) return <div className="text-red-500">{error}</div>;

	return (
		<>
			<AlertModal
				isOpen={openDeleteSelectedMessages}
				onClose={() => setOpenDeleteSelectedMessages(false)}
				onConfirm={deleteSelectedMessages}
				loading={loading}
			/>
			<div className="flex items-center justify-between">
				<Heading
					title="Message Queue"
					badge={messageQueueData.length}
					description={`Manage Message Queue. (${format(currentTime, "yyyy-MM-dd HH:mm:ss")})`}
				/>
				<div className="flex items-center gap-2">
					<Button
						onClick={() => setOpenDeleteSelectedMessages(true)}
						disabled={loading || Object.keys(selectedRows).length === 0}
						variant="outline"
					>
						{loading ? (
							<>
								<IconLoader className="mr-2 h-4 w-4 animate-spin" />
								Deleting...
							</>
						) : (
							<>Delete Selected</>
						)}
					</Button>
				</div>
			</div>

			<DataTableCheckbox
				columns={columns}
				data={messageQueueData}
				initiallySelected={{}}
				disabled={false}
				onRowSelectionChange={setSelectedRows}
			/>
		</>
	);
}

interface CellActionProps {
	item: MessageQueue;
	onUpdated?: (item: MessageQueue) => void;
}
