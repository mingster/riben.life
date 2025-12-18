"use client";

import { IconDownload, IconLoader, IconPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import axios from "axios";
import { useParams } from "next/navigation";

import type { StoreFacility } from "@/types";

import { mapFacilityToColumn } from "../table-column";
import { BulkAddFacilitiesDialog } from "./bulk-add-facilities-dialog";
import { createTableColumns } from "./columns";
import { EditFacilityDialog } from "./edit-facility-dialog";
import { ImportFacilityDialog } from "./import-facility-dialog";

interface TableClientProps {
	serverData: StoreFacility[];
}

export const FacilityClient: React.FC<TableClientProps> = ({ serverData }) => {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [exporting, setExporting] = useState(false);

	const sortTables = useCallback((tables: StoreFacility[]) => {
		return [...tables].sort((a, b) =>
			a.facilityName.localeCompare(b.facilityName, undefined, {
				numeric: true,
				sensitivity: "base",
			}),
		);
	}, []);

	const [data, setData] = useState<StoreFacility[]>(() =>
		sortTables(serverData.map(mapFacilityToColumn)),
	);

	useEffect(() => {
		setData(sortTables(serverData.map(mapFacilityToColumn)));
	}, [serverData, sortTables]);

	const handleCreated = useCallback(
		(newTable: StoreFacility) => {
			if (!newTable) return;
			setData((prev) => {
				const exists = prev.some((item) => item.id === newTable.id);
				if (exists) return prev;
				return sortTables([...prev, newTable]);
			});
		},
		[sortTables],
	);

	const handleBulkCreated = useCallback(
		(newTables: StoreFacility[]) => {
			if (!newTables?.length) return;
			setData((prev) => {
				const existingIds = new Set(prev.map((item) => item.id));
				const filtered = newTables.filter((item) => !existingIds.has(item.id));
				if (!filtered.length) {
					return prev;
				}
				return sortTables([...prev, ...filtered]);
			});
		},
		[sortTables],
	);

	const handleDeleted = useCallback((facilityId: string) => {
		setData((prev) => prev.filter((item) => item.id !== facilityId));
	}, []);

	const handleUpdated = useCallback(
		(updated: StoreFacility) => {
			if (!updated) return;
			setData((prev) => {
				const next = prev.map((item) =>
					item.id === updated.id ? updated : item,
				);
				return sortTables(next);
			});
		},
		[sortTables],
	);

	const handleExport = useCallback(async () => {
		setExporting(true);

		const res = await axios.post(
			`/api/storeAdmin/${params.storeId}/facility/export`,
			{},
			{
				responseType: "blob",
			},
		);

		// Get filename from Content-Disposition header or use default
		const contentDisposition = res.headers["content-disposition"];
		let fileName = `facility-backup-${params.storeId}.json`;
		if (contentDisposition) {
			const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
			if (fileNameMatch) {
				fileName = fileNameMatch[1];
			}
		}

		// Create blob and download
		const blob = res.data as Blob;
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

		setExporting(false);
	}, [params.storeId, t]);

	const handleImported = useCallback(async () => {
		try {
			// Fetch updated facilities from server using GET API endpoint
			const response = await fetch(
				`/api/storeAdmin/${params.storeId}/facilities`,
				{
					method: "GET",
				},
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({
					error: `HTTP ${response.status}: ${response.statusText}`,
				}));
				throw new Error(errorData.error || "Failed to fetch facilities");
			}

			const facilities: StoreFacility[] = await response.json();

			// Update client-side data with fetched facilities
			setData(sortTables(facilities));
		} catch (error) {
			toastError({
				title: t("error_title"),
				description:
					error instanceof Error
						? error.message
						: "Failed to refresh facilities after import",
			});
		}
	}, [params.storeId, sortTables, t]);

	const columns = useMemo(
		() =>
			createTableColumns(t, {
				onDeleted: handleDeleted,
				onUpdated: handleUpdated,
			}),
		[t, handleDeleted, handleUpdated],
	);

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title={t("facility_mgmt")}
					badge={data.length}
					description=""
				/>
				<div className="flex flex-wrap gap-1.5 sm:gap-2 sm:content-end items-center">
					<EditFacilityDialog
						isNew
						onCreated={handleCreated}
						trigger={
							<Button variant="outline" className="h-10 sm:h-9">
								<IconPlus className="mr-2 size-4" />
								<span className="text-sm sm:text-xs">{t("create")}</span>
							</Button>
						}
					/>
					<BulkAddFacilitiesDialog onCreatedMany={handleBulkCreated} />
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
								<IconDownload className="mr-2 size-4" />
								<span className="text-sm sm:text-xs">
									{t("export") || "Export"}
								</span>
							</>
						)}
					</Button>
					<ImportFacilityDialog onImported={handleImported} />
				</div>
			</div>
			<Separator />
			<DataTable<StoreFacility, unknown>
				columns={columns}
				data={data}
				searchKey="facilityName"
			/>
		</>
	);
};
