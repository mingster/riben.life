"use client";

import { IconDownload, IconLoader, IconPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Loader } from "@/components/loader";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { useParams } from "next/navigation";

import type { ServiceStaffColumn } from "../service-staff-column";

import { createTableColumns } from "./columns";
import { EditServiceStaffDialog } from "./edit-service-staff-dialog";
import { ImportServiceStaffDialog } from "./import-service-staff-dialog";

interface ServiceStaffClientProps {
	serverData: ServiceStaffColumn[];
	currencyDecimals?: number;
	facilities?: Array<{ id: string; facilityName: string }>;
}

export const ServiceStaffClient: React.FC<ServiceStaffClientProps> = ({
	serverData,
	currencyDecimals = 2,
	facilities = [],
}) => {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const sortServiceStaff = useCallback((items: ServiceStaffColumn[]) => {
		return [...items].sort((a, b) => {
			const nameA = a.userName || a.userEmail || "";
			const nameB = b.userName || b.userEmail || "";
			return nameA.localeCompare(nameB, undefined, {
				numeric: true,
				sensitivity: "base",
			});
		});
	}, []);

	const [data, setData] = useState<ServiceStaffColumn[]>(() =>
		sortServiceStaff(serverData),
	);

	useEffect(() => {
		setData(sortServiceStaff(serverData));
	}, [serverData, sortServiceStaff]);

	const handleCreated = useCallback(
		(newItem: ServiceStaffColumn) => {
			if (!newItem) return;
			setData((prev) => {
				const exists = prev.some((item) => item.id === newItem.id);
				if (exists) return prev;
				return sortServiceStaff([...prev, newItem]);
			});
		},
		[sortServiceStaff],
	);

	const handleDeleted = useCallback((id: string) => {
		setData((prev) => prev.filter((item) => item.id !== id));
	}, []);

	const handleUpdated = useCallback(
		(updated: ServiceStaffColumn) => {
			if (!updated) return;
			setData((prev) => {
				const next = prev.map((item) =>
					item.id === updated.id ? updated : item,
				);
				return sortServiceStaff(next);
			});
		},
		[sortServiceStaff],
	);

	const [exporting, setExporting] = useState(false);

	const handleExport = useCallback(async () => {
		setExporting(true);
		try {
			const res = await fetch(
				`/api/storeAdmin/${params.storeId}/service-staff/export`,
				{
					method: "POST",
				},
			);

			// Check if response is an error by status code
			if (!res.ok) {
				// Only parse as JSON if status indicates error
				const contentType = res.headers.get("content-type");
				if (contentType?.includes("application/json")) {
					const errorData = await res.json();
					toastError({
						title: t("export_failed") || "Export failed",
						description: errorData.error || "Unknown error",
					});
				} else {
					const text = await res.text();
					toastError({
						title: t("export_failed") || "Export failed",
						description: text || `HTTP ${res.status}`,
					});
				}
				return;
			}

			// Get filename from Content-Disposition header or use default
			const contentDisposition = res.headers.get("content-disposition");
			let fileName = `service-staff-backup-${params.storeId}.json`;
			if (contentDisposition) {
				const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
				if (fileNameMatch) {
					fileName = fileNameMatch[1];
				}
			}

			// Create blob and download
			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = fileName;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);

			toastSuccess({
				title: t("exported") || "Exported",
				description: fileName,
			});
		} catch (err: unknown) {
			if (err instanceof Error) {
				toastError({
					title: t("export_failed") || "Export failed",
					description: err.message,
				});
			}
		} finally {
			setExporting(false);
		}
	}, [params.storeId, t]);

	const handleImported = useCallback(async () => {
		try {
			// Refresh the page to get updated service staff from server
			window.location.reload();
		} catch (error) {
			toastError({
				title: t("error_title"),
				description:
					error instanceof Error
						? error.message
						: "Failed to refresh service staff after import",
			});
		}
	}, [t]);

	const columns = useMemo(
		() =>
			createTableColumns(t, {
				onDeleted: handleDeleted,
				onUpdated: handleUpdated,
				currencyDecimals,
				facilities,
			}),
		[t, handleDeleted, handleUpdated, currencyDecimals, facilities],
	);

	if (!mounted) {
		return (
			<div className="flex min-h-[200px] items-center justify-center">
				<Loader />
			</div>
		);
	}

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title={t("service_staff_mgmt") || "Service Staff Management"}
					badge={data.length}
					description=""
				/>
				<div className="flex flex-wrap gap-1.5 sm:gap-2 sm:content-end items-center">
					<Button
						onClick={handleExport}
						disabled={exporting}
						variant="outline"
						className="h-10 sm:h-9"
					>
						{exporting ? (
							<>
								<IconLoader className="mr-2 h-4 w-4 animate-spin" />
								<span className="text-sm sm:text-xs">
									{t("exporting") || "Exporting..."}
								</span>
							</>
						) : (
							<>
								<IconDownload className="mr-2 h-4 w-4" />
								<span className="text-sm sm:text-xs">
									{t("export") || "Export"}
								</span>
							</>
						)}
					</Button>
					<ImportServiceStaffDialog onImported={handleImported} />
					<EditServiceStaffDialog
						isNew
						onCreated={handleCreated}
						trigger={
							<Button variant="outline" className="h-10 sm:h-9">
								<IconPlus className="mr-2 size-4" />
								<span className="text-sm sm:text-xs">{t("create")}</span>
							</Button>
						}
					/>
				</div>
			</div>
			<Separator />
			<DataTable<ServiceStaffColumn, unknown>
				columns={columns}
				data={data}
				searchKey="userName"
			/>
		</>
	);
};
