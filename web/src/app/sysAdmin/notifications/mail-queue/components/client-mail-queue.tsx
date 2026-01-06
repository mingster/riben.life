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
import { Skeleton } from "@/components/ui/skeleton";
import type { EmailQueue } from "@/types";
import { formatDateTime, getUtcNow } from "@/utils/datetime-utils";
import { EditMailQueue } from "./edit-mail-queue";
import { format } from "date-fns";
import Link from "next/link";
import logger from "@/lib/logger";
import { useIsHydrated } from "@/hooks/use-hydrated";
import useSWR from "swr";

// MailQueueAdminPage provides the following features:
// 1. review the mail queue in the table
// 2. send selected mail in queue
// 3. review send result in console log
// 4. delete selected mail in queue
// 5. call sendMailsInQueue from a button click
// it will call /api/sysAdmin/emailQueue to get the mail queue data and refresh every 30 seconds.
//
export default function MailQueueAdminClient({
	stores = [],
	messageTemplates = [],
}: {
	stores?: Array<{ id: string; name: string | null }>;
	messageTemplates?: Array<{ id: string; name: string }>;
}) {
	const isHydrated = useIsHydrated();
	const [currentTime, setCurrentTime] = useState(() => getUtcNow());

	// Conditional URL - only fetch if hydrated
	const url = isHydrated ? "/api/sysAdmin/emailQueue" : null;

	const fetcher = (url: RequestInfo) => fetch(url).then((res) => res.json());
	const {
		data: mailQueueData,
		error,
		isLoading,
		mutate,
	} = useSWR<EmailQueue[]>(url, fetcher, {
		refreshInterval: 10000, // Poll every 10 seconds
		revalidateOnFocus: true,
		revalidateOnReconnect: true,
	});

	// Update current time every 10 seconds
	useEffect(() => {
		if (!isHydrated) return;

		const timerId = setInterval(() => {
			setCurrentTime(getUtcNow());
		}, 10000);

		return () => clearInterval(timerId);
	}, [isHydrated]);

	const [openDeleteSelectedMails, setOpenDeleteSelectedMails] = useState(false);

	//console.log("mailQueueData", mailQueueData);

	const [selectedRows, setSelectedRows] = useState<RowSelectionState>({});
	const [selectedMailQueueIds, setSelectedMailQueueIds] = useState<string[]>(
		[],
	);

	const handleUpdated = (updatedVal: EmailQueue) => {
		// Update SWR cache optimistically
		mutate(
			(currentData) => {
				if (!currentData) return currentData;
				return currentData.map((obj) =>
					obj.id === updatedVal.id
						? ({
								...updatedVal,
								cc: updatedVal.cc ?? "",
								bcc: updatedVal.bcc ?? "",
								sendTries: updatedVal.sendTries ?? 0,
								sentOn: updatedVal.sentOn ?? null,
							} as EmailQueue)
						: obj,
				);
			},
			{ revalidate: false },
		);
		logger.info("handleUpdated");
	};

	const handleDeleted = (deletedVal: EmailQueue) => {
		// Update SWR cache optimistically
		mutate(
			(currentData) => {
				if (!currentData) return currentData;
				return currentData.filter((obj) => obj.id !== deletedVal.id);
			},
			{ revalidate: false },
		);
		logger.info("handleDeleted");
	};

	//console.log("selectedMailQueueIds", selectedMailQueueIds);
	const columns: ColumnDef<EmailQueue>[] = [
		{
			id: "select",
			accessorKey: "id",
			header: ({ table }) => (
				<Checkbox
					checked={
						table.getIsAllPageRowsSelected() ||
						(table.getIsSomePageRowsSelected() && "indeterminate")
					}
					// toggle row state, also set or unset MailQueueIds for all rows
					onCheckedChange={(selectAll) => {
						// setSelectedMailQueueIds for all rows
						if (selectAll) {
							const allRows = table.getRowModel().rows;
							const allIds = allRows.map((row) => row.original.id);
							setSelectedMailQueueIds(allIds); // set all ids to selectedMailQueueIds
						} else {
							setSelectedMailQueueIds([]);
						}

						table.toggleAllPageRowsSelected(!!selectAll); // toggle all rows selected state
					}}
					aria-label="Select all"
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					// push this row id to selectedMailQueueIds
					onCheckedChange={(isChecked) => {
						row.toggleSelected(!!isChecked);
						if (isChecked) {
							setSelectedMailQueueIds((prev) => [...prev, row.original.id]);
						} else {
							setSelectedMailQueueIds((prev) =>
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
			accessorKey: "from",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="from" />;
			},
			enableHiding: false,
		},
		{
			accessorKey: "to",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="to" />;
			},
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<Link href={`/sysAdmin/users/${row.getValue("to")}`}>
						{row.getValue("to")}
					</Link>
				</div>
			),
		},
		{
			accessorKey: "subject",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="subject" />;
			},
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					{row.getValue("subject")}
					<EditMailQueue
						item={{
							id: row.original.id,
							from: row.original.from,
							fromName: row.original.fromName,
							to: row.original.to,
							toName: row.original.toName,
							subject: row.original.subject,
							textMessage: row.original.textMessage,
							htmMessage: row.original.htmMessage,
							cc: row.original.cc || undefined,
							bcc: row.original.bcc || undefined,
							sendTries: row.original.sendTries || undefined,
							sentOn: row.original.sentOn || undefined,
							storeId: row.original.storeId || null,
							notificationId: row.original.notificationId || null,
							templateId: row.original.templateId || null,
							priority: row.original.priority ?? 0,
						}}
						onUpdated={handleUpdated}
						stores={stores}
						messageTemplates={messageTemplates}
					/>
				</div>
			),
		},
		{
			accessorKey: "createdOn",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="created on" />;
			},
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					{formatDateTime(row.getValue("createdOn"))}
				</div>
			),
		},
		{
			accessorKey: "sentOn",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="sent on" />;
			},
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					{row.getValue("sentOn") ? formatDateTime(row.getValue("sentOn")) : ""}
				</div>
			),
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
			accessorKey: "templateId",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="Template" />;
			},
			cell: ({ row }) => {
				const templateId = row.getValue("templateId") as string | null;
				if (!templateId) return <div>-</div>;
				const template = messageTemplates.find((t) => t.id === templateId);
				return <div>{template?.name || templateId}</div>;
			},
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
					`${process.env.NEXT_PUBLIC_API_URL}/sysAdmin/emailQueue/${item.id}`,
				);
				toastSuccess({
					title: "queued mail deleted",
					description: "",
				});
			} catch (error: unknown) {
				const err = error as AxiosError;
				toastError({
					title: "something wrong.",
					description: err.message,
				});
			} finally {
				setLoading(false);
				setOpen(false);

				// also update data from parent component or caller
				handleDeleted(item);
				//onUpdated?.(item);
			}
		};

		const onCopy = (id: string) => {
			navigator.clipboard.writeText(id);
			toastSuccess({
				title: "ID copied to clipboard.",
				description: "",
			});
		};

		const onSend = (id: string) => {
			// send mail to the recipient

			logger.info("onSend");
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

	const [sending, setSending] = useState(false);

	// send selected mails in the mail queue
	const sendSelectedMails = async () => {
		if (selectedMailQueueIds.length === 0) {
			toastError({
				title: "No mails selected",
				description: "Please select at least one mail to send",
			});
			return;
		}
		setSending(true);

		// send the given mail(s) in the mail queue
		// return the result of the send operation
		const result = await axios.post(
			`${process.env.NEXT_PUBLIC_API_URL}/sysAdmin/emailQueue/send-given-mails-in-queue`,
			{ mailQueueIds: selectedMailQueueIds },
		);

		// get the result of the send operation
		const mailsSent = result.data.result.mailsSent;
		const processed = result.data.result.processed;
		const success = result.data.result.success;
		const failed = result.data.result.failed;

		logger.info("mailsSent");
		logger.info("processed");
		logger.info("success");
		logger.info("failed");

		// Update SWR cache optimistically
		mutate(
			(currentData) => {
				if (!currentData) return currentData;
				return currentData.filter((obj) => !mailsSent.includes(obj.id));
			},
			{ revalidate: true },
		);

		toastSuccess({
			title: "Mails sent",
			description: `Mails sent successfully: ${success} of ${processed}`,
		});
		setSending(false);
	};

	const deleteSelectedMails = async () => {
		if (selectedMailQueueIds.length === 0) {
			toastError({
				title: "No mails selected",
				description: "Please select at least one mail to send",
			});
			return;
		}

		setSending(true);
		logger.info("deleteSelectedMails");
		for (const id of selectedMailQueueIds) {
			try {
				const result = await axios.delete(
					`${process.env.NEXT_PUBLIC_API_URL}/sysAdmin/emailQueue/${id}`,
				);
				logger.info("result");
				handleDeleted(result.data);
			} catch (error: unknown) {
				const err = error as AxiosError;
				toastError({
					title: "something wrong.",
					description: err.message,
				});
			}
		}

		toastSuccess({
			title: "Mails deleted",
			description: "Mails deleted successfully",
		});

		setSelectedRows({});
		setSelectedMailQueueIds([]);

		setSending(false);
		setOpenDeleteSelectedMails(false);
	};

	// send all mails in the mail queue
	const handleSendAllInQueue = async () => {
		// call sendMailsInQueue from a button click
		logger.info("handleSendAllInQueue");
		const result = await axios.post(
			`${process.env.NEXT_PUBLIC_API_URL}/sysAdmin/emailQueue/send-mails-in-queue`,
		);
		logger.info("result");
		toastSuccess({
			title: "Mails in queue called",
			description: "Mails in queue called - please check the console log",
		});
	};

	// Clear selectedMailQueueIds when selectedRows is cleared
	useEffect(() => {
		if (Object.keys(selectedRows).length === 0) {
			setSelectedMailQueueIds([]);
		}
	}, [selectedRows]);

	// Don't render until hydrated to prevent hydration mismatch
	if (!isHydrated) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	// Show loading state
	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	// Show error state (silent fail - don't show error UI)
	if (error || !mailQueueData) {
		return null;
	}

	return (
		<>
			<AlertModal
				isOpen={openDeleteSelectedMails}
				onClose={() => setOpenDeleteSelectedMails(false)}
				onConfirm={deleteSelectedMails}
				loading={false}
			/>
			<div className="flex items-center justify-between">
				<Heading
					title="Mail Queue"
					badge={mailQueueData.length}
					description={`Manage Mail Queue. (${format(currentTime, "yyyy-MM-dd HH:mm:ss")})`}
				/>
				<div className="flex items-center gap-2">
					<Button
						onClick={sendSelectedMails}
						disabled={sending || Object.keys(selectedRows).length === 0}
						variant="outline"
					>
						{sending ? (
							<>
								<IconLoader className="mr-2 h-4 w-4 animate-spin" />
								sending...
							</>
						) : (
							<>send selected</>
						)}
					</Button>
					<Button
						onClick={handleSendAllInQueue}
						disabled={sending}
						variant="outline"
					>
						{sending ? (
							<>
								<IconLoader className="mr-2 h-4 w-4 animate-spin" />
								sending...
							</>
						) : (
							<>send all in queue</>
						)}
					</Button>
					<Button
						onClick={() => setOpenDeleteSelectedMails(true)}
						disabled={sending || Object.keys(selectedRows).length === 0}
						variant="outline"
					>
						{sending ? (
							<>
								<IconLoader className="mr-2 h-4 w-4 animate-spin" />
								deleting...
							</>
						) : (
							<>delete selected</>
						)}
					</Button>
				</div>
			</div>

			<DataTableCheckbox
				columns={columns}
				data={mailQueueData || []}
				initiallySelected={{}}
				disabled={false}
				onRowSelectionChange={setSelectedRows}
			/>
		</>
	);
}

interface CellActionProps {
	item: EmailQueue;
	onUpdated?: (newValue: EmailQueue) => void;
}
