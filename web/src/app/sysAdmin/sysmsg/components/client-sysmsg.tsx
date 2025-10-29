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
import type { z } from "zod/v4";
import type { updateSystemMessageSchema } from "@/actions/sysAdmin/systemMessage/update-system-message.validation";
import { DataTable } from "@/components/dataTable";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Heading } from "@/components/heading";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import type { SystemMessage } from "@/types";
import { formatDateTime, getUtcNow } from "@/utils/datetime-utils";
import EditSystemMessage from "./edit-sysmsg";

interface props {
	serverData: SystemMessage[];
}

interface CellActionProps {
	item: z.infer<typeof updateSystemMessageSchema>;
	onUpdated?: (newValue: z.infer<typeof updateSystemMessageSchema>) => void;
}

export const SystemMessageClient: React.FC<props> = ({ serverData }) => {
	const [data, setData] = useState<SystemMessage[]>(serverData);

	//const { lng } = useI18n();
	//const { t } = useTranslation(lng);

	// Define newMessage object
	const newMessage = {
		message: "",
		localeId: "",
		published: false,
		id: "new", // Use a temporary ID like 'new' to identify new items
	} as SystemMessage;

	/* #region maintain data array on client side */
	const handleCreated = (newVal: z.infer<typeof updateSystemMessageSchema>) => {
		setData((prev) => [
			...prev,
			{
				...newVal,
				createdOn: getUtcNow(),
			},
		]);
		console.log("handleCreated", newVal);
	};

	// Handle updated value in the data array
	const handleUpdated = (
		updatedVal: z.infer<typeof updateSystemMessageSchema>,
	) => {
		setData((prev) =>
			prev.map((cat) =>
				cat.id === updatedVal.id ? { ...cat, ...updatedVal } : cat,
			),
		);
		console.log("handleUpdated", updatedVal);
	};

	const handleDeleted = (
		deletedVal: z.infer<typeof updateSystemMessageSchema>,
	) => {
		setData((prev) => prev.filter((cat) => cat.id !== deletedVal.id));
		console.log("handleDeleted", deletedVal);
	};
	/* #endregion */

	const CellAction: React.FC<CellActionProps> = ({ item, onUpdated }) => {
		const [loading, setLoading] = useState(false);
		const [open, setOpen] = useState(false);
		//const router = useRouter();
		//const _params = useParams();

		const onConfirm = async () => {
			try {
				setLoading(true);
				await axios.delete(
					`${process.env.NEXT_PUBLIC_API_URL}/sysAdmin/sysmsg/${item.id}`,
				);

				toastSuccess({
					title: "system message deleted",
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

	const columns: ColumnDef<z.infer<typeof updateSystemMessageSchema>>[] = [
		{
			accessorKey: "message",
			header: "message",
			cell: ({ row }) => {
				return (
					<EditSystemMessage item={row.original} onUpdated={handleUpdated} />
				);
			},
			enableHiding: false,
		},
		{
			accessorKey: "localeId",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="locale" />;
			},
		},
		{
			accessorKey: "published",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="published" />;
			},
			cell: ({ row }) => {
				const val =
					row.getValue("published") === true ? (
						<IconCheck className="text-green-400  size-4" />
					) : (
						<IconX className="text-red-400 size-4" />
					);

				return <div className="pl-3">{val}</div>;
			},
		},
		{
			accessorKey: "createdOn",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="created on" />;
			},
			cell: ({ row }) => {
				return (
					<div className="pl-3">
						{formatDateTime(row.getValue("createdOn"))}
					</div>
				);
			},
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
					description="Manage system message displayed to client."
				/>

				<div>
					{/*新增 */}
					<EditSystemMessage item={newMessage} onUpdated={handleCreated} />
				</div>
			</div>
			<Separator />
			<DataTable
				//rowSelectionEnabled={false}
				columns={columns}
				data={data}
			/>
		</>
	);
};
