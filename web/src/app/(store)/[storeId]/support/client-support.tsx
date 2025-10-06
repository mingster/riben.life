"use client";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Heading } from "@/components/heading";
import { AlertModal } from "@/components/modals/alert-modal";
import { DisplayTicket } from "@/components/store/display-ticket";
import { DisplayTicketStatus } from "@/components/store/display-ticket-status";

import { toastError, toastSuccess } from "@/components/Toaster";
import { Button } from "@/components/ui/button";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import type { User, SupportTicket } from "@/types";
import { TicketStatus } from "@/types/enum";
import { IconInputX } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import axios, { type AxiosError } from "axios";
import { useMemo, useState, useCallback } from "react";
import { FAQ } from "@/components/store/FAQ";
import { EditTicket } from "./edit-ticket";
import { useParams } from "next/navigation";
import { clientLogger } from "@/lib/client-logger";

// Constants
const ALL_TICKET_STATUS = "--";
const DEFAULT_PANEL_SIZE = 50;

// Types
interface ClientSupportProps {
	user: User;
	serverData: SupportTicket[];
}

interface CellActionProps {
	item: SupportTicket;
	onUpdated?: (newValue: SupportTicket) => void;
}

interface TicketThreadProps {
	thread: SupportTicket;
	index: number;
}

// Memoized ticket thread component
const TicketThread = ({ thread, index }: TicketThreadProps) => (
	<div key={thread.id} className="flex flex-row gap-2">
		<div className="bg-amber-900 p-2 text-white text-xs font-medium rounded">
			{index + 1}
		</div>
		<DisplayTicket item={thread} />
	</div>
);

export function ClientSupport({ user, serverData }: ClientSupportProps) {
	const [tickets, setTickets] = useState<SupportTicket[]>(serverData);
	//default to all
	const [ticketStatusFilter, setTicketStatusFilter] =
		useState<string>(ALL_TICKET_STATUS);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const params = useParams();

	// Memoized ticket creation handler
	const handleCreated = useCallback((newVal: SupportTicket) => {
		setTickets((prev) => [
			...prev,
			{
				...newVal,
			},
		]);
	}, []);

	// Memoized ticket update handler
	const handleUpdated = useCallback((updatedVal: SupportTicket) => {
		setTickets((prev) =>
			prev.map((ticket) => (ticket.id === updatedVal.id ? updatedVal : ticket)),
		);
	}, []);

	// Memoized filtered tickets
	const filteredTickets = useMemo(() => {
		if (!ticketStatusFilter || ticketStatusFilter === ALL_TICKET_STATUS) {
			return tickets;
		}
		return tickets.filter(
			(ticket) => ticket.status === Number(ticketStatusFilter),
		);
	}, [tickets, ticketStatusFilter]);

	// Memoized status options
	const statusOptions = useMemo(
		() => [
			{ value: ALL_TICKET_STATUS, label: t("TicketStatus_all") },
			{ value: TicketStatus.Open.toString(), label: t("TicketStatus_Open") },
			{
				value: TicketStatus.Replied.toString(),
				label: t("TicketStatus_Replied"),
			},
			{
				value: TicketStatus.Closed.toString(),
				label: t("TicketStatus_Closed"),
			},
		],
		[t],
	);

	// Memoized columns definition
	const columns: ColumnDef<SupportTicket>[] = useMemo(
		() => [
			{
				accessorKey: "lastModified",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("ticket_message")} />
				),
				cell: ({ row }) => (
					<div className="text-xs">
						<div className="text-sm font-bold text-gray-900 dark:text-gray-100">
							{row.original.subject}
						</div>
						<DisplayTicket item={row.original} />

						<Separator className="my-2" />
						<div className="w-full space-y-2">
							{row.original.Thread.map((thread: SupportTicket, index: number) => (
								<TicketThread key={thread.id} thread={thread} index={index} />
							))}
						</div>
					</div>
				),
			},
			{
				accessorKey: "status",
				header: () => <div className="pl-4">{t("ticket_status")}</div>,
				cell: ({ row }) => (
					<div className="flex items-center justify-center">
						<DisplayTicketStatus
							status={row.original.status}
							variant="badge"
							compact={true}
						/>
					</div>
				),
				enableHiding: false,
			},
			{
				id: "actions",
				header: () => <div className="text-right pr-2">{t("actions")}</div>,
				cell: ({ row }) => (
					<div className="flex gap-2 justify-end">
						<EditTicket
							item={row.original}
							onUpdated={handleUpdated}
							isNew={false}
							currentUser={user}
						/>
						{row.original.status !== TicketStatus.Closed && (
							<CellAction item={row.original} onUpdated={handleUpdated} />
						)}
					</div>
				),
			},
		],
		[t, handleUpdated, user],
	);

	// Memoized cell action component
	const CellAction: React.FC<CellActionProps> = ({ item, onUpdated }) => {
		const [loading, setLoading] = useState(false);
		const [modalOpen, setModalOpen] = useState(false);

		// Memoized close ticket handler
		const onConfirm = useCallback(async () => {
			try {
				setLoading(true);
				const result = await axios.post(
					`${process.env.NEXT_PUBLIC_API_URL}/store/${params.storeId}/support-ticket/close`,
					item,
				);
				toastSuccess({
					description: t("ticket_close_success"),
				});
				onUpdated?.(result.data);
			} catch (error: unknown) {
				const err = error as AxiosError;
				clientLogger.error(`Error closing ticket: ${err.message}`, {
					metadata: { ticket: item },
					tags: ["onConfirm"],
					service: "client-support",
					environment: process.env.NODE_ENV,
					version: process.env.npm_package_version,
				});
				toastError({
					title: t("ticket_update_error"),
					description: err.message,
				});
			} finally {
				setLoading(false);
				setModalOpen(false);
			}
		}, [item, onUpdated, params.storeId, t]);

		// Memoized modal close handler
		const handleModalClose = useCallback(() => {
			setModalOpen(false);
		}, []);

		// Memoized button click handler
		const handleButtonClick = useCallback(() => {
			setModalOpen(true);
		}, []);

		return (
			<>
				<AlertModal
					isOpen={modalOpen}
					onClose={handleModalClose}
					onConfirm={onConfirm}
					loading={loading}
				/>
				<Button
					title={t("ticket_close")}
					variant="ghost"
					size="sm"
					onClick={handleButtonClick}
					className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
					aria-label={t("ticket_close")}
				>
					<IconInputX size={16} />
				</Button>
			</>
		);
	};

	// Memoized header content
	const headerContent = useMemo(
		() => (
			<div className="flex items-center justify-between">
				<Heading
					title={t("ticket_title")}
					badge={tickets.length}
					description={t("ticket_description")}
				/>
				<div className="flex items-center gap-2">
					<Select
						value={ticketStatusFilter}
						onValueChange={setTicketStatusFilter}
						aria-label={t("filter_by_status")}
					>
						<SelectTrigger className="w-48">
							<SelectValue placeholder={t("TicketStatus_all")} />
						</SelectTrigger>
						<SelectContent>
							{statusOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
		),
		[t, tickets.length, ticketStatusFilter, statusOptions],
	);

	return (
		<section
			id="support"
			className="w-full content-start relative h-screen"
			aria-label="Support tickets and FAQ"
		>
			<ResizablePanelGroup direction="horizontal">
				<ResizablePanel className="flex-3/4 pl-2">
					<div className="space-y-4">
						{headerContent}

						<DataTable
							columns={columns}
							data={filteredTickets}
							aria-label="Support tickets table"
						/>

						<EditTicket
							item={null}
							onUpdated={handleCreated}
							isNew={true}
							currentUser={user}
						/>
					</div>
				</ResizablePanel>

				<ResizableHandle
					withHandle
					className="dark:bg-gray-800 dark:text-gray-800"
					aria-label="Resize panels"
				/>

				<ResizablePanel
					className="pl-4 hidden lg:block"
					defaultSize={DEFAULT_PANEL_SIZE}
					aria-label="FAQ section"
				>
					<FAQ />
				</ResizablePanel>
			</ResizablePanelGroup>
		</section>
	);
}
