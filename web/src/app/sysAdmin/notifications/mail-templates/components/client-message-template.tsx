"use client";

import type { updateMessageTemplateLocalizedSchema } from "@/actions/sysAdmin/messageTemplateLocalized/update-message-template-localized.validation";
import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Heading } from "@/components/heading";
import { Loader } from "@/components/loader";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
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
import logger from "@/lib/logger";
import {
	LIFECYCLE_CHANNELS,
	LIFECYCLE_RECIPIENTS,
	ORDER_LIFECYCLE_EVENTS,
	RESERVATION_LIFECYCLE_EVENTS,
	SUBSCRIPTION_LIFECYCLE_EVENTS,
} from "@/lib/notification/lifecycle-events";
import {
	parseLifecycleTemplateKey,
	validateLifecycleTemplateCoverage,
} from "@/lib/notification/template-registry";
import { useI18n } from "@/providers/i18n-provider";
import type {
	Locale,
	MessageTemplate,
	MessageTemplateLocalized,
} from "@/types";
import {
	IconCheck,
	IconCopy,
	IconDots,
	IconLoader,
	IconTrash,
	IconX,
} from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import axios, { isAxiosError, type AxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import type { z } from "zod";
import { EditMessageTemplate } from "./edit-message-template";
import { EditMessageTemplateLocalized } from "./edit-message-template-localized";

interface props {
	serverData: MessageTemplate[];
	messageTemplateLocalized: MessageTemplateLocalized[];
	locales: Locale[];
	stores?: Array<{ id: string; name: string | null }>;
}

interface LocalizationCoverageReport {
	requiredLocales: string[];
	templateCount: number;
	totalExpectedLocalizedRows: number;
	totalExistingLocalizedRows: number;
	totalMissingLocalizedRows: number;
	missingByLocale: Record<string, number>;
}

interface CellActionProps {
	item: MessageTemplate;
	onUpdated?: (newValue: MessageTemplate) => void;
}
/** Sentinel for "show all" in template/locale filter selects (must match SelectItem value). */
const filterAllValue = "--";
export const MessageTemplateClient: React.FC<props> = ({
	serverData,
	messageTemplateLocalized,
	locales,
	stores = [],
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [messageTemplateData, setMessageTemplateData] =
		useState<MessageTemplate[]>(serverData);

	const [messageTemplateLocalizedData, setMessageTemplateLocalizedData] =
		useState<MessageTemplateLocalized[]>(messageTemplateLocalized);

	const [localeIdFilter, setLocaleIdFilter] = useState<string>(filterAllValue);
	const [lifecycleDomainFilter, setLifecycleDomainFilter] =
		useState<string>(filterAllValue);
	const [lifecycleEventFilter, setLifecycleEventFilter] =
		useState<string>(filterAllValue);
	const [lifecycleRecipientFilter, setLifecycleRecipientFilter] =
		useState<string>(filterAllValue);
	const [lifecycleChannelFilter, setLifecycleChannelFilter] =
		useState<string>(filterAllValue);
	const [messageTemplateIdFilter, setMessageTemplateIdFilter] =
		useState<string>(filterAllValue);
	const [exporting, setExporting] = useState(false);
	const [importing, setImporting] = useState(false);
	const [importDialogOpen, setImportDialogOpen] = useState(false);
	const [backupFiles, setBackupFiles] = useState<string[]>([]);
	const [selectedFile, setSelectedFile] = useState<string>("");
	const [translationStatusFilter, setTranslationStatusFilter] = useState<
		"all" | "draft" | "reviewed" | "approved"
	>("all");
	const [showMissingLocaleOnly, setShowMissingLocaleOnly] = useState(false);
	const [backfillingLocales, setBackfillingLocales] = useState(false);
	const [coverageReport, setCoverageReport] =
		useState<LocalizationCoverageReport | null>(null);

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
		} catch (err: unknown) {
			toastError({
				title: "Export failed",
				description: err instanceof Error ? err.message : "Unknown error",
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
		} catch (err: unknown) {
			let message = "Unknown error";
			if (isAxiosError(err)) {
				const data = err.response?.data as { error?: string } | undefined;
				message =
					(typeof data?.error === "string" && data.error) ||
					err.response?.statusText ||
					err.message;
			} else if (err instanceof Error) {
				message = err.message;
			}
			toastError({
				title: t("import_failed"),
				description: message,
			});
		} finally {
			setImporting(false);
		}
	};

	const loadCoverageReport = async () => {
		try {
			const response = await axios.get(
				"/api/sysAdmin/messageTemplate/localization-coverage",
			);
			if (response.data?.success && response.data.report) {
				setCoverageReport(response.data.report as LocalizationCoverageReport);
			}
		} catch (_error) {
			// no-op; page remains functional without this summary
		}
	};

	const handleBackfillLocales = async () => {
		setBackfillingLocales(true);
		try {
			const response = await axios.post(
				"/api/sysAdmin/messageTemplate/backfill-locales",
			);
			if (response.data?.success) {
				toastSuccess({
					title: "Backfill completed",
					description: `Created ${response.data.result.localizedRowsCreated} localizations.`,
				});
				window.location.reload();
				return;
			}
			toastError({
				title: "Backfill failed",
				description: response.data?.error || "Unknown error",
			});
		} catch (error: unknown) {
			toastError({
				title: "Backfill failed",
				description: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setBackfillingLocales(false);
		}
	};

	useEffect(() => {
		loadCoverageReport();
	}, []);

	useEffect(() => {
		setLifecycleEventFilter(filterAllValue);
	}, [lifecycleDomainFilter]);

	const lifecycleEventOptions = useMemo(() => {
		if (
			lifecycleDomainFilter === filterAllValue ||
			lifecycleDomainFilter === "other"
		) {
			return [
				...new Set([
					...ORDER_LIFECYCLE_EVENTS,
					...RESERVATION_LIFECYCLE_EVENTS,
					...SUBSCRIPTION_LIFECYCLE_EVENTS,
				]),
			].sort((a, b) => a.localeCompare(b));
		}
		if (lifecycleDomainFilter === "order") {
			return [...ORDER_LIFECYCLE_EVENTS];
		}
		if (lifecycleDomainFilter === "reservation") {
			return [...RESERVATION_LIFECYCLE_EVENTS];
		}
		if (lifecycleDomainFilter === "subscription") {
			return [...SUBSCRIPTION_LIFECYCLE_EVENTS];
		}
		return [];
	}, [lifecycleDomainFilter]);

	const messageTemplatesSortedByName = useMemo(() => {
		return [...messageTemplateData].sort((a, b) =>
			a.name.localeCompare(b.name),
		);
	}, [messageTemplateData]);

	const filteredMessageTemplateLocalizedData = useMemo(() => {
		return messageTemplateLocalizedData
			.filter((item) => {
				const tpl = messageTemplateData.find(
					(x) => x.id === item.messageTemplateId,
				);
				const parsed = tpl?.name?.trim()
					? parseLifecycleTemplateKey(tpl.name.trim())
					: null;

				if (lifecycleDomainFilter !== filterAllValue) {
					if (lifecycleDomainFilter === "other") {
						if (parsed !== null) return false;
					} else if (parsed?.domain !== lifecycleDomainFilter) {
						return false;
					}
				}

				if (
					lifecycleEventFilter !== filterAllValue &&
					(!parsed || parsed.event !== lifecycleEventFilter)
				) {
					return false;
				}

				if (
					lifecycleRecipientFilter !== filterAllValue &&
					(!parsed || parsed.recipient !== lifecycleRecipientFilter)
				) {
					return false;
				}

				if (
					lifecycleChannelFilter !== filterAllValue &&
					(!parsed || parsed.channel !== lifecycleChannelFilter)
				) {
					return false;
				}

				return true;
			})
			.filter((item) => {
				if (
					!messageTemplateIdFilter ||
					messageTemplateIdFilter === filterAllValue
				) {
					return true;
				}
				return item.messageTemplateId === messageTemplateIdFilter;
			})
			.filter((item) => {
				if (!localeIdFilter || localeIdFilter === filterAllValue) return true;
				return item.localeId === localeIdFilter;
			})
			.filter((item) => {
				if (translationStatusFilter === "all") return true;
				return item.translationStatus === translationStatusFilter;
			})
			.filter((item) => {
				if (!showMissingLocaleOnly) return true;
				const template = messageTemplateData.find(
					(current) => current.id === item.messageTemplateId,
				);
				return (
					(template?.MessageTemplateLocalized?.length ?? 0) < locales.length
				);
			});
	}, [
		messageTemplateData,
		messageTemplateIdFilter,
		messageTemplateLocalizedData,
		localeIdFilter,
		locales.length,
		showMissingLocaleOnly,
		translationStatusFilter,
		lifecycleDomainFilter,
		lifecycleEventFilter,
		lifecycleRecipientFilter,
		lifecycleChannelFilter,
	]);

	const lifecycleCoverage = useMemo(() => {
		const records = messageTemplateLocalizedData.map((item) => ({
			templateName:
				messageTemplateData.find(
					(template) => template.id === item.messageTemplateId,
				)?.name ?? "",
			locale: item.localeId,
		}));
		const requiredLocales = ["zh-TW", "en-US", "ja-JP"];
		const missing = validateLifecycleTemplateCoverage({
			requiredLocales,
			records,
		});
		return {
			missingCount: missing.length,
			sample: missing.slice(0, 12),
		};
	}, [messageTemplateData, messageTemplateLocalizedData]);

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
		logger.info("handleCreated");
	};

	// Handle updated value in the data array
	const handleUpdated = (updatedVal: MessageTemplate) => {
		setMessageTemplateData((prev) =>
			prev.map((cat) => (cat.id === updatedVal.id ? updatedVal : cat)),
		);
		logger.info("handleUpdated");
	};

	const handleDeleted = (deletedVal: MessageTemplate) => {
		setMessageTemplateData((prev) =>
			prev.filter((cat) => cat.id !== deletedVal.id),
		);
		logger.info("handleDeleted");
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
					<EditMessageTemplate
						item={row.original}
						onUpdated={handleUpdated}
						stores={stores}
					/>
				</div>
			),
			enableHiding: false,
		},
		{
			accessorKey: "templateType",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="Type" />;
			},
		},
		{
			accessorKey: "isGlobal",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="Global" />;
			},
			cell: ({ row }) => {
				const val =
					row.getValue("isGlobal") === true ? (
						<IconCheck className="text-green-400 size-4" />
					) : (
						<IconX className="text-red-400 size-4" />
					);
				return <div className="pl-3">{val}</div>;
			},
		},
		{
			accessorKey: "storeId",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="Store" />;
			},
			cell: ({ row }) => {
				const storeId = row.getValue("storeId") as string | null;
				if (!storeId) return <div>Global</div>;
				const store = stores.find((s) => s.id === storeId);
				return <div>{store?.name || storeId}</div>;
			},
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
			id: "coverage",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="coverage" />;
			},
			cell: ({ row }) => {
				const localizedCount = row.original.MessageTemplateLocalized.length;
				const missingCount = Math.max(0, locales.length - localizedCount);
				return (
					<div className="text-xs">
						{missingCount === 0 ? (
							<span className="rounded bg-green-100 px-2 py-1 text-green-700">
								complete
							</span>
						) : (
							<span className="rounded bg-amber-100 px-2 py-1 text-amber-700">
								missing {missingCount}
							</span>
						)}
					</div>
				);
			},
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
		const availableLocales: Locale[] = (locales || []).filter(
			(locale) =>
				!localizedTemplates.some(
					(localized) => localized.localeId === locale.lng,
				),
		);

		// 3. sort the available locales by name
		availableLocales.sort((a, b) => a.name.localeCompare(b.name));

		//console.log("availableLocales", availableLocales);

		// If no locales are available, don't render the button
		if (availableLocales.length === 0) {
			return null;
		}

		const newObj: z.infer<typeof updateMessageTemplateLocalizedSchema> = {
			id: "new",
			messageTemplateId: item.id,
			localeId: availableLocales[0]?.lng || "",
			subject: "",
			body: "",
			isActive: true,
			bCCEmailAddresses: undefined,
			translationStatus: "draft",
			sourceLocaleId: null,
		};

		return (
			<EditMessageTemplateLocalized
				item={newObj}
				locales={availableLocales}
				messageTemplateName={item.name ?? null}
				messageTemplateType={item.templateType ?? null}
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
		updatedVal: MessageTemplateLocalized,
	) => {
		setMessageTemplateLocalizedData((prev) =>
			prev.map((cat) => (cat.id === updatedVal.id ? updatedVal : cat)),
		);
		logger.info("handleMessageTemplateLocalizedUpdated");
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

		logger.info("handleMessageTemplateLocalizedDeleted");
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
				cell: ({ row }) => {
					const template = messageTemplateData.find(
						(tpl) => tpl.id === row.original.messageTemplateId,
					);
					return (
						<div>
							{row.getValue("subject")}
							<EditMessageTemplateLocalized
								item={
									{
										...row.original,
										bCCEmailAddresses:
											row.original.bCCEmailAddresses ?? undefined,
										translationStatus:
											row.original.translationStatus || "draft",
										sourceLocaleId: row.original.sourceLocaleId || null,
									} as z.infer<typeof updateMessageTemplateLocalizedSchema>
								}
								locales={locales}
								messageTemplateName={template?.name ?? null}
								messageTemplateType={template?.templateType ?? null}
								onUpdated={(updated) => {
									handleMessageTemplateLocalizedUpdated({
										...updated,
										bCCEmailAddresses: updated.bCCEmailAddresses ?? null,
									} as MessageTemplateLocalized);
								}}
							/>
						</div>
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
						item={
							{
								...row.original,
								bCCEmailAddresses: row.original.bCCEmailAddresses ?? undefined,
								translationStatus: row.original.translationStatus || "draft",
								sourceLocaleId: row.original.sourceLocaleId || null,
							} as z.infer<typeof updateMessageTemplateLocalizedSchema>
						}
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
			{importing && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
					<Loader />
				</div>
			)}
			<Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("import_backup")}</DialogTitle>
						<DialogDescription>
							{t("select_backup_file")} — JSON files under{" "}
							<code className="rounded bg-muted px-1 text-xs">
								public/backup
							</code>
							.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-2">
						<select
							value={selectedFile}
							onChange={(e) => setSelectedFile(e.target.value)}
							className="border rounded p-2"
							disabled={importing}
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
						<Button
							onClick={() => setImportDialogOpen(false)}
							variant="ghost"
							disabled={importing}
						>
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
					<EditMessageTemplate
						item={newObj}
						onUpdated={handleCreated}
						stores={stores}
					/>

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
			<div className="mt-3 rounded-md border p-3">
				<div className="text-sm font-medium">Lifecycle coverage</div>
				<div className="mt-1 text-xs text-muted-foreground">
					{lifecycleCoverage.missingCount === 0
						? "All lifecycle template locale entries are present."
						: `Missing ${lifecycleCoverage.missingCount} lifecycle locale entries.`}
				</div>
				{lifecycleCoverage.sample.length > 0 && (
					<div className="mt-2 max-h-28 overflow-auto rounded bg-muted/30 p-2 text-xs">
						{lifecycleCoverage.sample.map((item) => (
							<div key={`${item.templateName}-${item.locale}`}>
								{item.templateName} ({item.locale})
							</div>
						))}
					</div>
				)}
				{coverageReport && (
					<div className="mt-2 text-xs text-muted-foreground">
						Expected localized rows: {coverageReport.totalExpectedLocalizedRows}
						, existing: {coverageReport.totalExistingLocalizedRows}, missing:{" "}
						{coverageReport.totalMissingLocalizedRows}
					</div>
				)}
			</div>
			{/* display filtered messageTemplate data */}
			<DataTable
				columns={columns}
				data={messageTemplateData}
				noSearch={false}
				searchKey="name"
			/>

			<Separator />

			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<Heading
					title="Message Template Localized"
					badge={filteredMessageTemplateLocalizedData.length}
					description="Manage Message Template Localized."
				/>
				<div className="flex min-w-0 flex-wrap items-center gap-2">
					<Select
						value={lifecycleDomainFilter}
						onValueChange={setLifecycleDomainFilter}
					>
						<SelectTrigger className="min-w-[140px] max-w-[min(100vw-2rem,200px)] touch-manipulation">
							<SelectValue placeholder={t("mail_templates_filter_domain")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={filterAllValue}>{t("all")}</SelectItem>
							<SelectItem value="order">
								{t("mail_templates_lifecycle_domain_order")}
							</SelectItem>
							<SelectItem value="reservation">
								{t("mail_templates_lifecycle_domain_reservation")}
							</SelectItem>
							<SelectItem value="subscription">
								{t("mail_templates_lifecycle_domain_subscription")}
							</SelectItem>
							<SelectItem value="other">
								{t("mail_templates_filter_other_name")}
							</SelectItem>
						</SelectContent>
					</Select>
					<Select
						value={lifecycleEventFilter}
						onValueChange={setLifecycleEventFilter}
					>
						<SelectTrigger className="min-w-[160px] max-w-[min(100vw-2rem,240px)] touch-manipulation">
							<SelectValue placeholder={t("mail_templates_filter_event")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={filterAllValue}>{t("all")}</SelectItem>
							{lifecycleEventOptions.map((ev) => (
								<SelectItem key={ev} value={ev}>
									{ev}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={lifecycleRecipientFilter}
						onValueChange={setLifecycleRecipientFilter}
					>
						<SelectTrigger className="min-w-[130px] max-w-[min(100vw-2rem,200px)] touch-manipulation">
							<SelectValue placeholder={t("mail_templates_filter_recipient")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={filterAllValue}>{t("all")}</SelectItem>
							{LIFECYCLE_RECIPIENTS.map((r) => (
								<SelectItem key={r} value={r}>
									{r}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={lifecycleChannelFilter}
						onValueChange={setLifecycleChannelFilter}
					>
						<SelectTrigger className="min-w-[130px] max-w-[min(100vw-2rem,200px)] touch-manipulation">
							<SelectValue placeholder={t("mail_templates_filter_channel")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={filterAllValue}>{t("all")}</SelectItem>
							{LIFECYCLE_CHANNELS.map((ch) => (
								<SelectItem key={ch} value={ch}>
									{ch}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={messageTemplateIdFilter}
						onValueChange={setMessageTemplateIdFilter}
					>
						<SelectTrigger className="min-w-[200px] max-w-[min(100vw-2rem,320px)] touch-manipulation">
							<SelectValue placeholder={t("mail_templates_all_templates")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={filterAllValue}>
								{t("mail_templates_all_templates")}
							</SelectItem>
							{messageTemplatesSortedByName.map((tpl) => (
								<SelectItem key={tpl.id} value={tpl.id}>
									{tpl.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={localeIdFilter || filterAllValue}
						onValueChange={setLocaleIdFilter}
					>
						<SelectTrigger className="min-w-[180px] max-w-[min(100vw-2rem,280px)] touch-manipulation">
							<SelectValue placeholder={t("mail_templates_all_locales")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={filterAllValue}>
								{t("mail_templates_all_locales")}
							</SelectItem>
							{locales.map((locale: Locale) => (
								<SelectItem key={locale.id} value={locale.lng}>
									{locale.name} ({locale.id})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={translationStatusFilter}
						onValueChange={(value) =>
							setTranslationStatusFilter(
								value as "all" | "draft" | "reviewed" | "approved",
							)
						}
					>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="Translation status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All statuses</SelectItem>
							<SelectItem value="draft">Draft</SelectItem>
							<SelectItem value="reviewed">Reviewed</SelectItem>
							<SelectItem value="approved">Approved</SelectItem>
						</SelectContent>
					</Select>
					<Button
						variant={showMissingLocaleOnly ? "default" : "outline"}
						onClick={() => setShowMissingLocaleOnly((prev) => !prev)}
					>
						{showMissingLocaleOnly
							? "Missing locale only"
							: "Show missing locale"}
					</Button>
					<Button
						variant="outline"
						onClick={handleBackfillLocales}
						disabled={backfillingLocales}
					>
						{backfillingLocales
							? "Backfilling..."
							: "Create missing locales from EN"}
					</Button>
				</div>
			</div>
			{/* display filtered messageTemplateLocalized data */}
			<DataTable
				noSearch={false}
				searchKey="subject"
				columns={columns_messageTemplateLocalized}
				data={filteredMessageTemplateLocalizedData}
			/>
		</>
	);
};
