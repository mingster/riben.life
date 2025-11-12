"use client";

import { IconPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";

import { createTableColumns } from "./columns";
import { BulkAddTablesDialog } from "./bulk-add-tables-dialog";
import { EditStoreTableDialog } from "./edit-table-dialog";
import type { TableColumn } from "../table-column";

interface TableClientProps {
	serverData: TableColumn[];
}

export const TableClient: React.FC<TableClientProps> = ({ serverData }) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const sortTables = useCallback((tables: TableColumn[]) => {
		return [...tables].sort((a, b) =>
			a.tableName.localeCompare(b.tableName, undefined, {
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
					title={t("StoreTable_Mgmt")}
					badge={data.length}
					description=""
				/>
				<div className="flex gap-2">
					<EditStoreTableDialog
						isNew
						onCreated={handleCreated}
						trigger={
							<Button variant="outline">
								<IconPlus className="mr-0 size-4" />
								{t("Create")}
							</Button>
						}
					/>
					<BulkAddTablesDialog onCreatedMany={handleBulkCreated} />
				</div>
			</div>
			<Separator />
			<DataTable<TableColumn, unknown>
				columns={columns}
				data={data}
				searchKey="tableName"
			/>
		</>
	);
};
