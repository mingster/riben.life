"use client";

import {
	IconCheck,
	IconCopy,
	IconDots,
	IconTrash,
	IconX,
} from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import axios, { type AxiosError } from "axios";
import { useState } from "react";
import { DataTable } from "@/components/dataTable";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Heading } from "@/components/heading";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import type { SystemMessage, SystemMessageLocale } from "@/types";
import { formatDateTime, getUtcNowEpoch } from "@/utils/datetime-utils";
import logger from "@/lib/logger";
import EditSystemMessage from "./edit-sysmsg";

interface Props {
	serverData: SystemMessage[];
}

export const SystemMessageClient: React.FC<Props> = ({ serverData }) => {
	const [data, setData] = useState<SystemMessage[]>(serverData);

	const newMessage: SystemMessage = {
		id: "new",
		name: "",
		published: false,
		locales: [],
		createdOn: getUtcNowEpoch(),
		updatedOn: getUtcNowEpoch(),
	};

	const handleCreated = (msg: SystemMessage) => {
		setData((prev) => [msg, ...prev]);
	};

	const handleUpdated = (msg: SystemMessage) => {
		setData((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
	};

	const handleDeleted = (id: string) => {
		setData((prev) => prev.filter((m) => m.id !== id));
	};

	const CellAction: React.FC<{ item: SystemMessage }> = ({ item }) => {
		const [loading, setLoading] = useState(false);
		const [open, setOpen] = useState(false);

		const onConfirm = async () => {
			try {
				setLoading(true);
				await axios.delete(
					`${process.env.NEXT_PUBLIC_API_URL}/sysAdmin/sysmsg/${item.id}`,
				);
				toastSuccess({ title: "Deleted", description: "" });
				handleDeleted(item.id);
			} catch (error: unknown) {
				const err = error as AxiosError;
				toastError({ title: "Error", description: err.message });
			} finally {
				setLoading(false);
				setOpen(false);
			}
		};

		const onCopy = () => {
			navigator.clipboard.writeText(item.id);
			toastSuccess({ title: "ID copied", description: "" });
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
						<DropdownMenuItem onClick={onCopy}>
							<IconCopy className="mr-2 size-4" /> Copy ID
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setOpen(true)}>
							<IconTrash className="mr-2 size-4" /> Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</>
		);
	};

	const columns: ColumnDef<SystemMessage>[] = [
		{
			accessorKey: "name",
			header: "Message",
			cell: ({ row }) => (
				<EditSystemMessage item={row.original} onUpdated={handleUpdated} />
			),
			enableHiding: false,
		},
		{
			accessorKey: "locales",
			header: "Locales",
			cell: ({ row }) => (
				<div className="flex flex-wrap gap-1">
					{row.original.locales.map((l: SystemMessageLocale) => (
						<Badge key={l.localeId} variant="secondary">
							{l.localeId.toUpperCase()}
						</Badge>
					))}
				</div>
			),
		},
		{
			accessorKey: "published",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Published" />
			),
			cell: ({ row }) =>
				row.getValue("published") ? (
					<IconCheck className="text-green-500 size-4" />
				) : (
					<IconX className="text-muted-foreground size-4" />
				),
		},
		{
			accessorKey: "createdOn",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Created" />
			),
			cell: ({ row }) =>
				formatDateTime(new Date(Number(row.getValue("createdOn")))),
		},
		{
			id: "actions",
			cell: ({ row }) => <CellAction item={row.original} />,
		},
	];

	return (
		<>
			<div className="flex items-center justify-between">
				<Heading
					title="System Messages"
					badge={data.length}
					description="Each message can have translations for multiple locales."
				/>
				<EditSystemMessage item={newMessage} onUpdated={handleCreated} />
			</div>
			<Separator />
			<DataTable columns={columns} data={data} />
		</>
	);
};
