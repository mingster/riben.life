"use client";

import {
	IconCheck,
	IconCopy,
	IconDots,
	IconLoader,
	IconTrash,
	IconX,
} from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import axios, { type AxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import type { z } from "zod/v4";
import type { updateMessageTemplateLocalizedSchema } from "@/actions/sysAdmin/messageTemplateLocalized/update-message-template-localized.validation";
import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Heading } from "@/components/heading";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import type {
	Locale,
	MessageTemplate,
	MessageTemplateLocalized,
} from "@/types";
import { EditMessageTemplate } from "./edit-message-template";
import { EditMessageTemplateLocalized } from "./edit-message-template-localized";

interface props {
	serverData: MessageTemplate[];
	messageTemplateLocalized: MessageTemplateLocalized[];
	locales: Locale[];
}

interface CellActionProps {
	item: MessageTemplate;
	onUpdated?: (newValue: MessageTemplate) => void;
}
const allLocaleId = "--";
export const MessageTemplateClient: React.FC<props> = ({
	serverData,
	messageTemplateLocalized,
	locales,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [messageTemplateData, setMessageTemplateData] =
		useState<MessageTemplate[]>(serverData);

	const [messageTemplateLocalizedData, setMessageTemplateLocalizedData] =
		useState<MessageTemplateLocalized[]>(messageTemplateLocalized);

	const [localeIdFilter, setLocaleIdFilter] = useState<string>("");
	const [exporting, setExporting] = useState(false);
	const [importing, setImporting] = useState(false);
	const [importDialogOpen, setImportDialogOpen] = useState(false);
	const [backupFiles, setBackupFiles] = useState<string[]>([]);
	const [selectedFile, setSelectedFile] = useState<string>("");

	// Fetch backup file list when dialog opens
	useEffect(() => {
		if (importDialogOpen) {
			axios
				.get("/api/sysAdmin/messageTemplate/list-backups")
				.then((res) => {
					setBackupFiles(res.data.files || []);
				})
				.catch(() => setBackupFiles([]));
		}
	}, [importDialogOpen]);

	const handleExport = async () => {
		setExporting(true);
		try {
			const res = await axios.post("/api/sysAdmin/messageTemplate/export");
			if (res.data?.success) {
				toastSuccess({
					title: "Exported",
					description: res.data?.fileName || "Export successful",
				});
			} else {
				toastError({
					title: "Export failed",
					description: res.data?.error || "Unknown error",
				});
			}
		} catch (err: any) {
			toastError({
				title: "Export failed",
				description: err?.message || "Unknown error",
			});
		} finally {
			setExporting(false);
		}
	};

	const handleImport = async () => {
		if (!selectedFile) return;
		setImporting(true);
		try {
			const res = await axios.post("/api/sysAdmin/messageTemplate/import", {
				fileName: selectedFile,
			});
			if (res.data?.success) {
				toastSuccess({ title: t("imported"), description: selectedFile });
				setImportDialogOpen(false);
				window.location.reload();
			} else {
				toastError({
					title: t("import_failed"),
					description: res.data?.error || "Unknown error",
				});
			}
		} catch (err: any) {
			toastError({
				title: t("import_failed"),
				description: err?.message || "Unknown error",
			});
		} finally {
			setImporting(false);
		}
	};

	const filteredMessageTemplateLocalizedData = useMemo(() => {
		if (!localeIdFilter || localeIdFilter === allLocaleId)
			return messageTemplateLocalizedData;
		return messageTemplateLocalizedData.filter(
			(cat) => cat.localeId === localeIdFilter,
		);
	}, [messageTemplateLocalizedData, localeIdFilter]);

	const newObj = {
		id: "new",
		name: "",
	} as MessageTemplate;

	/* #region maintain data array on client side */

	const handleCreated = (newVal: MessageTemplate) => {
		setMessageTemplateData((prev) => [
			...prev,
			{
				...newVal,
			},
		]);
		console.log("handleCreated", newVal);
	};

	// Handle updated value in the data array
	const handleUpdated = (updatedVal: MessageTemplate) => {
		setMessageTemplateData((prev) =>
			prev.map((cat) => (cat.id === updatedVal.id ? updatedVal : cat)),
		);
		console.log("handleUpdated", updatedVal);
	};

	const handleDeleted = (deletedVal: MessageTemplate) => {
		setMessageTemplateData((prev) =>
			prev.filter((cat) => cat.id !== deletedVal.id),
		);
		console.log("handleDeleted", deletedVal);
	};

	/* #endregion */

	/* #region message_template dt */

	const columns: ColumnDef<MessageTemplate>[] = [
		{
			accessorKey: "name",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="name" />;
			},
			cell: ({ row }) => (
				<div>
					{row.getValue("name")}
					<EditMessageTemplate item={row.original} onUpdated={handleUpdated} />
				</div>
			),
			enableHiding: false,
		},

		{
			accessorKey: "localizedCount",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="# of localized" />;
			},
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					{row.original.MessageTemplateLocalized.length}
					<CellCreateNewLocalized item={row.original} />
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

	//the plus button to create new localized template
	const CellCreateNewLocalized: React.FC<CellActionProps> = ({ item }) => {
		//filter out the locales that already have a localized template for this message template
		// 1. get the localized templates for this message template
		const localizedTemplates = messageTemplateLocalizedData.filter(
			(localized) => localized.messageTemplateId === item.id,
		);

		//console.log("localizedTemplates", localizedTemplates);

		// 2. filter out locales that already have localized template
		const availableLocales: Locale[] = locales.filter(
			(locale) =>
				!localizedTemplates.some(
					(localized) => localized.localeId === locale.lng,
				),
		);

		// 3. sort the available locales by name
		availableLocales.sort((a, b) => a.name.localeCompare(b.name));

		//console.log("availableLocales", availableLocales);

		const newObj = {
			id: "new",
			messageTemplateId: item.id,
			localeId: availableLocales[0].lng || "",
			subject: "",
			body: "",
			isActive: true,
		} as MessageTemplateLocalized;

		return (
			<EditMessageTemplateLocalized
				item={newObj}
				locales={availableLocales}
				onUpdated={handleMessageTemplateLocalizedCreated}
				isNew={true}
			/>
		);
	};

	const CellAction: React.FC<CellActionProps> = ({ item, onUpdated }) => {
		const [loading, setLoading] = useState(false);
		const [open, setOpen] = useState(false);

		const onConfirm = async () => {
			try {
				setLoading(true);
				await axios.delete(
					`${process.env.NEXT_PUBLIC_API_URL}/sysAdmin/messageTemplate/${item.id}`,
				);
				toastSuccess({
					title: "message template deleted",
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
	/* #endregion */

	/* #region maintain messageTemplateLocalized data array on client side */

	const handleMessageTemplateLocalizedCreated = (
		newMessageTemplateLocalized: MessageTemplateLocalized,
	) => {
		//update the localized message template count of the template
		const template = messageTemplateData.find(
			(cat) => cat.id === newMessageTemplateLocalized.messageTemplateId,
		);

		if (template) {
			//console.log("template", template);

			//add the new localized template to template
			template.MessageTemplateLocalized.push(newMessageTemplateLocalized);

			//handleUpdated(template);
			setMessageTemplateData((prev) =>
				prev.map((cat) => (cat.id === template.id ? template : cat)),
			);

			console.log(
				"handleMessageTemplateLocalizedCreated",
				template,
				newMessageTemplateLocalized,
			);
		}
		//add the new localized template to messageTemplateLocalizedData
		setMessageTemplateLocalizedData((prev) => [
			...prev,
			newMessageTemplateLocalized,
		]);
	};

	const handleMessageTemplateLocalizedUpdated = (
		updatedVal: z.infer<typeof updateMessageTemplateLocalizedSchema>,
	) => {
		setMessageTemplateLocalizedData((prev) =>
			prev.map((cat) => (cat.id === updatedVal.id ? updatedVal : cat)),
		);
		console.log("handleMessageTemplateLocalizedUpdated", updatedVal);
	};

	const handleMessageTemplateLocalizedDeleted = (
		deletedVal: z.infer<typeof updateMessageTemplateLocalizedSchema>,
	) => {
		//remove the localized message template from the messageTemplateData array
		setMessageTemplateLocalizedData((prev) =>
			prev.filter((cat) => cat.id !== deletedVal.id),
		);

		// move the localized template from parent message template
		const template = messageTemplateData.find(
			(cat) => cat.id === deletedVal.messageTemplateId,
		);
		if (template) {
			//remove the localized template from the template
			template.MessageTemplateLocalized =
				template.MessageTemplateLocalized.filter(
					(localized: MessageTemplateLocalized) =>
						localized.id !== deletedVal.id,
				);

			handleUpdated(template);
		}

		console.log("handleMessageTemplateLocalizedDeleted", deletedVal);
	};
	/* #endregion */

	/* #region messageTemplateLocalized dt columns */

	const columns_messageTemplateLocalized: ColumnDef<MessageTemplateLocalized>[] =
		[
			{
				accessorKey: "subject",
				header: ({ column }) => {
					return <DataTableColumnHeader column={column} title="subject" />;
				},
				cell: ({ row }) => (
					<div>
						{row.getValue("subject")}
						<EditMessageTemplateLocalized
							item={row.original}
							locales={locales}
							onUpdated={handleMessageTemplateLocalizedUpdated}
						/>
					</div>
				),
				enableHiding: false,
			},
			{
				accessorKey: "localeId",
				header: ({ column }) => {
					return <DataTableColumnHeader column={column} title="locale" />;
				},
			},
			{
				accessorKey: "messageTemplateId",
				header: ({ column }) => {
					return <DataTableColumnHeader column={column} title="Template" />;
				},
				cell: ({ row }) => {
					const val = row.getValue("messageTemplateId");
					const template = messageTemplateData.find((cat) => cat.id === val);
					return <div>{template?.name}</div>;
				},
			},
			{
				accessorKey: "isActive",
				header: ({ column }) => {
					return <DataTableColumnHeader column={column} title="isActive" />;
				},
				cell: ({ row }) => {
					const val =
						row.getValue("isActive") === true ? (
							<IconCheck className="text-green-400  size-4" />
						) : (
							<IconX className="text-red-400 size-4" />
						);

					return <div className="pl-3">{val}</div>;
				},
			},
			{
				accessorKey: "bCCEmailAddresses",
				header: ({ column }) => {
					return <DataTableColumnHeader column={column} title="bCC" />;
				},
			},
			{
				id: "actions",
				cell: ({ row }) => (
					<CellActionMessageTemplateLocalized
						item={row.original}
						onUpdated={handleMessageTemplateLocalizedDeleted}
					/>
				),
			},
		];

	interface MessageTemplateLocalizedCellActionProps {
		item: z.infer<typeof updateMessageTemplateLocalizedSchema>;
		onUpdated?: (
			newValue: z.infer<typeof updateMessageTemplateLocalizedSchema>,
		) => void;
	}

	const CellActionMessageTemplateLocalized: React.FC<
		MessageTemplateLocalizedCellActionProps
	> = ({ item, onUpdated }) => {
		const [loading, setLoading] = useState(false);
		const [open, setOpen] = useState(false);

		const onConfirm = async () => {
			try {
				setLoading(true);
				await axios.delete(
					`${process.env.NEXT_PUBLIC_API_URL}/sysAdmin/messageTemplateLocalized/${item.id}`,
				);
				toastSuccess({
					title: "message template localized deleted",
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
				handleMessageTemplateLocalizedDeleted(item);
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
	/* #endregion */

	return (
		<>
			<Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("import_backup")}</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col gap-2">
						<select
							value={selectedFile}
							onChange={(e) => setSelectedFile(e.target.value)}
							className="border rounded p-2"
						>
							<option value="">{t("select_backup_file")}</option>
							{backupFiles.map((f) => (
								<option key={f} value={f}>
									{f}
								</option>
							))}
						</select>
					</div>
					<DialogFooter>
						<Button onClick={() => setImportDialogOpen(false)} variant="ghost">
							{t("cancel")}
						</Button>
						<Button
							onClick={handleImport}
							disabled={!selectedFile || importing}
							variant="default"
						>
							{importing ? (
								<>
									<IconLoader className="mr-2 h-4 w-4 animate-spin" />
									{t("importing")}
								</>
							) : (
								t("import")
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<div className="flex items-center justify-between">
				<Heading
					title="Message Templates"
					badge={messageTemplateData.length}
					description="Manage Message Templates and its localized templates."
				/>
				<div className="flex items-center gap-2">
					{/* Locale Filter Dropdown */}
					<Select value={localeIdFilter} onValueChange={setLocaleIdFilter}>
						<SelectTrigger>
							<SelectValue placeholder="All Locales" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="--">All Locales</SelectItem>
							{locales.map((locale: Locale) => (
								<SelectItem key={locale.id} value={locale.lng}>
									{locale.name} ({locale.id})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{/*新增 */}
					<EditMessageTemplate item={newObj} onUpdated={handleCreated} />

					<Button onClick={handleExport} disabled={exporting} variant="outline">
						{exporting ? (
							<>
								<IconLoader className="mr-2 h-4 w-4 animate-spin" />
								{t("exporting")}
							</>
						) : (
							<>{t("export")}</>
						)}
					</Button>
					<Button onClick={() => setImportDialogOpen(true)} variant="outline">
						{t("import")}
					</Button>
				</div>
			</div>
			{/* display filtered messageTemplate data */}
			<DataTable
				//rowSelectionEnabled={false}
				columns={columns}
				data={messageTemplateData}
				//customizeColumns={false}
			/>

			<Separator />

			<div className="flex items-center justify-between">
				<Heading
					title="Message Template Localized"
					badge={messageTemplateLocalizedData.length}
					description="Manage Message Template Localized."
				/>
			</div>
			{/* display filtered messageTemplateLocalized data */}
			<DataTable
				searchKey="subject"
				columns={columns_messageTemplateLocalized}
				data={filteredMessageTemplateLocalizedData}
			/>
		</>
	);
};
