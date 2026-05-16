"use client";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Heading } from "@/components/heading";
import { Loader } from "@/components/loader";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { Badge } from "@/components/ui/badge";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { IconCopy, IconDots, IconLoader, IconTrash } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import axios, { isAxiosError, type AxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import { EditMessageTemplate } from "./edit-message-template";

interface LocalizationCoverageReport {
	requiredLocales: string[];
	templateCount: number;
	totalExpectedLocalizedRows: number;
	totalExistingLocalizedRows: number;
	totalMissingLocalizedRows: number;
	missingByLocale: Record<string, number>;
}

interface props {
	serverData: MessageTemplate[];
	locales: Locale[];
	stores?: Array<{ id: string; name: string | null }>;
}

export const MessageTemplateClient: React.FC<props> = ({
	serverData,
	locales,
	stores = [],
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [messageTemplateData, setMessageTemplateData] =
		useState<MessageTemplate[]>(serverData);
	const [domainFilter, setDomainFilter] = useState("--");
	const [eventFilter, setEventFilter] = useState("--");
	const [recipientFilter, setRecipientFilter] = useState("--");
	const [channelFilter, setChannelFilter] = useState("--");
	const [exporting, setExporting] = useState(false);
	const [importing, setImporting] = useState(false);
	const [importDialogOpen, setImportDialogOpen] = useState(false);
	const [backupFiles, setBackupFiles] = useState<string[]>([]);
	const [selectedFile, setSelectedFile] = useState<string>("");
	const [backfillingLocales, setBackfillingLocales] = useState(false);
	const [coverageReport, setCoverageReport] =
		useState<LocalizationCoverageReport | null>(null);

	useEffect(() => {
		if (importDialogOpen) {
			axios
				.get("/api/sysAdmin/messageTemplate/list-backups")
				.then((res) => setBackupFiles(res.data.files || []))
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
			toastError({ title: t("import_failed"), description: message });
		} finally {
			setImporting(false);
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
		axios
			.get("/api/sysAdmin/messageTemplate/localization-coverage")
			.then((response) => {
				if (response.data?.success && response.data.report) {
					setCoverageReport(response.data.report as LocalizationCoverageReport);
				}
			})
			.catch(() => {});
	}, []);

	// Reset event filter when domain changes
	const handleDomainChange = (value: string) => {
		setDomainFilter(value);
		setEventFilter("--");
	};

	const eventOptions = useMemo(() => {
		if (domainFilter === "--" || domainFilter === "other") {
			return [
				...new Set([
					...ORDER_LIFECYCLE_EVENTS,
					...RESERVATION_LIFECYCLE_EVENTS,
					...SUBSCRIPTION_LIFECYCLE_EVENTS,
				]),
			].sort((a, b) => a.localeCompare(b));
		}
		if (domainFilter === "order") return [...ORDER_LIFECYCLE_EVENTS];
		if (domainFilter === "reservation")
			return [...RESERVATION_LIFECYCLE_EVENTS];
		if (domainFilter === "subscription")
			return [...SUBSCRIPTION_LIFECYCLE_EVENTS];
		return [];
	}, [domainFilter]);

	const filteredTemplateData = useMemo(() => {
		if (
			domainFilter === "--" &&
			eventFilter === "--" &&
			recipientFilter === "--" &&
			channelFilter === "--"
		) {
			return messageTemplateData;
		}
		return messageTemplateData.filter((tpl) => {
			const parsed = tpl.name?.trim()
				? parseLifecycleTemplateKey(tpl.name.trim())
				: null;

			if (domainFilter !== "--") {
				if (domainFilter === "other") {
					if (parsed !== null) return false;
				} else if (parsed?.domain !== domainFilter) {
					return false;
				}
			}
			if (eventFilter !== "--" && (!parsed || parsed.event !== eventFilter)) {
				return false;
			}
			if (
				recipientFilter !== "--" &&
				(!parsed || parsed.recipient !== recipientFilter)
			) {
				return false;
			}
			if (
				channelFilter !== "--" &&
				(!parsed || parsed.channel !== channelFilter)
			) {
				return false;
			}
			return true;
		});
	}, [
		messageTemplateData,
		domainFilter,
		eventFilter,
		recipientFilter,
		channelFilter,
	]);

	const lifecycleCoverage = useMemo(() => {
		const records = messageTemplateData.flatMap((tpl) =>
			(tpl.MessageTemplateLocalized ?? []).map(
				(loc: MessageTemplateLocalized) => ({
					templateName: tpl.name ?? "",
					locale: loc.localeId,
				}),
			),
		);
		const requiredLocales = ["zh-TW", "en-US", "ja-JP"];
		const missing = validateLifecycleTemplateCoverage({
			requiredLocales,
			records,
		});
		return { missingCount: missing.length, sample: missing.slice(0, 12) };
	}, [messageTemplateData]);

	const handleCreated = (newVal: MessageTemplate) => {
		setMessageTemplateData((prev) => [...prev, newVal]);
		logger.info("handleCreated");
	};

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

	interface CellActionProps {
		item: MessageTemplate;
	}

	const CellAction: React.FC<CellActionProps> = ({ item }) => {
		const [loading, setLoading] = useState(false);
		const [open, setOpen] = useState(false);

		const onConfirm = async () => {
			try {
				setLoading(true);
				await axios.delete(
					`${process.env.NEXT_PUBLIC_API_URL}/sysAdmin/messageTemplate/${item.id}`,
				);
				toastSuccess({ title: "message template deleted", description: "" });
				handleDeleted(item);
			} catch (error: unknown) {
				const err = error as AxiosError;
				toastError({ title: "something wrong.", description: err.message });
			} finally {
				setLoading(false);
				setOpen(false);
			}
		};

		const onCopy = (id: string) => {
			navigator.clipboard.writeText(id);
			toastSuccess({ title: "ID copied to clipboard.", description: "" });
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

	const columns: ColumnDef<MessageTemplate>[] = [
		{
			accessorKey: "name",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="name" />
			),
			cell: ({ row }) => (
				<EditMessageTemplate
					item={row.original}
					onUpdated={handleUpdated}
					stores={stores}
				/>
			),
			enableHiding: false,
		},
		{
			accessorKey: "templateType",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Type" />
			),
		},
		{
			accessorKey: "MessageTemplateLocalized",
			header: "Locales",
			cell: ({ row }) => (
				<div className="flex flex-wrap gap-1">
					{row.original.MessageTemplateLocalized.map(
						(loc: MessageTemplateLocalized) => (
							<Badge key={loc.localeId} variant="secondary">
								{loc.localeId.toUpperCase()}
							</Badge>
						),
					)}
				</div>
			),
		},
		{
			id: "coverage",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="coverage" />
			),
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
			cell: ({ row }) => <CellAction item={row.original} />,
		},
	];

	const newObj = { id: "new", name: "" } as MessageTemplate;

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
					description="Manage Message Templates and locale variants."
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
							t("export")
						)}
					</Button>
					<Button onClick={() => setImportDialogOpen(true)} variant="outline">
						{t("import")}
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

			<div className="flex flex-wrap items-center gap-2 mt-2">
				<Select value={domainFilter} onValueChange={handleDomainChange}>
					<SelectTrigger className="min-w-[140px] max-w-[200px] touch-manipulation">
						<SelectValue placeholder="Domain" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="--">{t("all")}</SelectItem>
						<SelectItem value="order">Order</SelectItem>
						<SelectItem value="reservation">Reservation</SelectItem>
						<SelectItem value="subscription">Subscription</SelectItem>
						<SelectItem value="other">Other</SelectItem>
					</SelectContent>
				</Select>
				<Select value={eventFilter} onValueChange={setEventFilter}>
					<SelectTrigger className="min-w-[160px] max-w-[240px] touch-manipulation">
						<SelectValue placeholder="Event" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="--">{t("all")}</SelectItem>
						{eventOptions.map((ev) => (
							<SelectItem key={ev} value={ev}>
								{ev}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={recipientFilter} onValueChange={setRecipientFilter}>
					<SelectTrigger className="min-w-[130px] max-w-[200px] touch-manipulation">
						<SelectValue placeholder="Recipient" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="--">{t("all")}</SelectItem>
						{LIFECYCLE_RECIPIENTS.map((r) => (
							<SelectItem key={r} value={r}>
								{r}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={channelFilter} onValueChange={setChannelFilter}>
					<SelectTrigger className="min-w-[130px] max-w-[200px] touch-manipulation">
						<SelectValue placeholder="Channel" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="--">{t("all")}</SelectItem>
						{LIFECYCLE_CHANNELS.map((ch) => (
							<SelectItem key={ch} value={ch}>
								{ch}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<DataTable
				columns={columns}
				data={filteredTemplateData}
				noSearch={false}
				searchKey="name"
			/>
		</>
	);
};
