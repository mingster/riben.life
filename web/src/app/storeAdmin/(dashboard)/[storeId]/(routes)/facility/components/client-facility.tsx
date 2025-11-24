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
import { useRouter } from "next/navigation";

import type { TableColumn } from "../table-column";
import { BulkAddFacilitiesDialog } from "./bulk-add-facilities-dialog";
import { createTableColumns } from "./columns";
import { EditFacilityDialog } from "./edit-facility-dialog";
import { ImportFacilityDialog } from "./import-facility-dialog";

interface TableClientProps {
	serverData: TableColumn[];
}

export const FacilityClient: React.FC<TableClientProps> = ({ serverData }) => {
	const params = useParams<{ storeId: string }>();
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [exporting, setExporting] = useState(false);

	const sortTables = useCallback((tables: TableColumn[]) => {
		return [...tables].sort((a, b) =>
			a.facilityName.localeCompare(b.facilityName, undefined, {
				numeric: true,
				sensitivity: "base",
			}),
		);
	}, []);

	const [data, setData] = useState<TableColumn[]>(() => sortTables(serverData));

	useEffect(() => {
		setData(sortTables(serverData));
	}, [serverData, sortTables]);

	const handleCreated = useCallback(
		(newTable: TableColumn) => {
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
		(newTables: TableColumn[]) => {
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

	const handleDeleted = useCallback((tableId: string) => {
		setData((prev) => prev.filter((item) => item.id !== tableId));
	}, []);

	const handleUpdated = useCallback(
		(updated: TableColumn) => {
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

	const handleImported = useCallback(() => {
		router.refresh();
	}, [router]);

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
			<div className="flex items-center justify-between">
				<Heading
					title={t("Facility_mgmt")}
					badge={data.length}
					description=""
				/>
				<div className="flex gap-2">
					<EditFacilityDialog
						isNew
						onCreated={handleCreated}
						trigger={
							<Button variant="outline">
								<IconPlus className="mr-0 size-4" />
								{t("Create")}
							</Button>
						}
					/>
					<BulkAddFacilitiesDialog onCreatedMany={handleBulkCreated} />
					<Button onClick={handleExport} disabled={exporting} variant="outline">
						{exporting ? (
							<>
								<IconLoader className="mr-2 h-4 w-4 animate-spin" />
								{t("exporting") || "Exporting..."}
							</>
						) : (
							<>
								<IconDownload className="mr-0 size-4" />
								{t("export") || "Export"}
							</>
						)}
					</Button>
					<ImportFacilityDialog onImported={handleImported} />
				</div>
			</div>
			<Separator />
			<DataTable<TableColumn, unknown>
				columns={columns}
				data={data}
				searchKey="facilityName"
			/>
		</>
	);
};
