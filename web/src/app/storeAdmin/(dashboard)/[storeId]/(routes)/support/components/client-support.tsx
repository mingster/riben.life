"use client";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Heading } from "@/components/heading";
import { AlertModal } from "@/components/modals/alert-modal";
import { DisplayTicket } from "@/components/display-ticket";
import { DisplayTicketStatus } from "@/components/display-ticket-status";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
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
import { IconFilter, IconTrash } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import axios, { type AxiosError } from "axios";
import { useMemo, useState } from "react";
import { ReplyTicket } from "./reply-ticket";
import { clientLogger } from "@/lib/client-logger";

const allTicketStatus = "ALL";

export function ClientSupport({
	user,
	serverData,
}: {
	user: User;
	serverData: SupportTicket[];
}) {
	const [tickets, setTickets] = useState<SupportTicket[]>(serverData);

	//default to all
	//const [statusFilter, setStatusFilter] = useState<string>(allTicketStatus);

	//default to ticketstatus.open
	const [statusFilter, setStatusFilter] = useState<string>(
		TicketStatus.Open.toString(),
	);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	// Filter tickets based on status
	const filteredTickets = useMemo(() => {
		if (statusFilter === allTicketStatus) {
			return tickets;
		}
		return tickets.filter(
			(ticket) => ticket.status.toString() === statusFilter,
		);
	}, [tickets, statusFilter]);

	//#region client side handlers
	const handleCreated = (newVal: SupportTicket) => {
		setTickets((prev) => [
			...prev,
			{
				...newVal,
			},
		]);
	};
	// Handle updated value in the data array
	const handleUpdated = (updatedVal: SupportTicket) => {
		setTickets((prev) =>
			prev.map((ticket) => (ticket.id === updatedVal.id ? updatedVal : ticket)),
		);
	};

	const handleDeleted = (deletedVal: SupportTicket) => {
		setTickets((prev) => prev.filter((ticket) => ticket.id !== deletedVal.id));
	};
	//#endregion

	//#region columns
	const columns: ColumnDef<SupportTicket>[] = [
		{
			accessorKey: "lastModified",
			header: () => {
				return <div className="pl-4">{t("ticket_message")} </div>;
			},
			cell: ({ row }) => (
				<div className="text-xs">
					<div className="text-sm font-bold">{row.original.subject}</div>
					<DisplayTicket item={row.original} />
					<Separator className="my-2" />
					<div className="">
						{row.original.Thread.map((thread: SupportTicket, index: number) => (
							<div key={thread.id} className="flex flex-row gap-2">
								<div className="bg-amber-900 p-2">{index + 1}</div>
								<DisplayTicket item={thread} compact={true} />
							</div>
						))}
					</div>
				</div>
			),
		},
		{
			accessorKey: "status",
			header: () => {
				return <div className="pl-4">{t("ticket_status")} </div>;
			},
			cell: ({ row }) => (
				<div className="">
					<DisplayTicketStatus status={row.getValue("status")} />
				</div>
			),
			enableHiding: false,
		},
		{
			id: "actions",
			cell: ({ row }) => (
				<div className="flex gap-0 justify-end">
					<ReplyTicket
						item={row.original}
						onUpdated={handleUpdated}
						isNew={false}
						currentUser={user}
					/>
					<CellAction item={row.original} onUpdated={handleDeleted} />
				</div>
			),
		},
	];

	interface CellActionProps {
		item: SupportTicket;
		onUpdated?: (newValue: SupportTicket) => void;
	}

	const CellAction: React.FC<CellActionProps> = ({ item, onUpdated }) => {
		const [loading, setLoading] = useState(false);
		const [modalOpen, setModalOpen] = useState(false);

		const onConfirm = async () => {
			// close ticket
			try {
				setLoading(true);
				await axios.delete(
					`${process.env.NEXT_PUBLIC_API_URL}/sysAdmin/support-ticket/${item.id}`,
				);
				toastSuccess({
					description: t("ticket_close_success"),
				});
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
				onUpdated?.(item);
			}
		};

		return (
			<>
				<AlertModal
					isOpen={modalOpen}
					onClose={() => setModalOpen(false)}
					onConfirm={onConfirm}
					loading={loading}
				/>
				<Button
					title={t("ticket_close")}
					variant={"ghost"}
					onClick={() => setModalOpen(true)}
				>
					<IconTrash size={8} />
				</Button>
			</>
		);
	};

	return (
		<div className="space-y-4 w-full">
			<div className="flex items-center justify-between">
				<Heading
					title={t("ticket_title")}
					badge={filteredTickets.length}
					description={t("ticket_description")}
				/>

				<div className="flex items-center gap-2">
					<IconFilter className="h-4 w-4" />
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder={t("ticket_status")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={allTicketStatus}>
								{t("TicketStatus_all")}
							</SelectItem>
							<SelectItem value={TicketStatus.Open.toString()}>
								{t("TicketStatus_Open")}
							</SelectItem>
							<SelectItem value={TicketStatus.Replied.toString()}>
								{t("TicketStatus_Replied")}
							</SelectItem>
							<SelectItem value={TicketStatus.Closed.toString()}>
								{t("TicketStatus_Closed")}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
			<DataTable columns={columns} data={filteredTickets} />
		</div>
	);
}
