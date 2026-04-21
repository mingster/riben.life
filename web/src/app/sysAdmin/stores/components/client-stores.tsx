"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { DataTable } from "@/components/dataTable";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import type {
	SysAdminOrganizationOption,
	SysAdminStoreRow,
	SysAdminUserOption,
} from "../store-column";

import { CellActionSysadminStore } from "./cell-action-sysadmin-store";
import {
	CreateSysAdminStoreDialog,
	EditSysAdminStoreDialog,
} from "./edit-sysadmin-store-dialog";

interface ClientStoresProps {
	serverStores: SysAdminStoreRow[];
	organizations: SysAdminOrganizationOption[];
	users: SysAdminUserOption[];
}

export function ClientStores({
	serverStores,
	organizations,
	users,
}: ClientStoresProps) {
	const [data, setData] = useState<SysAdminStoreRow[]>(serverStores);
	const [showArchived, setShowArchived] = useState(false);

	const filtered = useMemo(
		() => (showArchived ? data : data.filter((row) => row.isDeleted === false)),
		[data, showArchived],
	);

	const handleUpdated = useCallback((row: SysAdminStoreRow) => {
		setData((prev) => prev.map((s) => (s.id === row.id ? row : s)));
	}, []);

	const handleCreated = useCallback((row: SysAdminStoreRow) => {
		setData((prev) => [row, ...prev]);
	}, []);

	const columns: ColumnDef<SysAdminStoreRow>[] = useMemo(
		() => [
			{
				accessorKey: "name",
				header: "Name",
				cell: ({ row }) => (
					<Link
						className="text-primary underline-offset-4 hover:underline"
						href={`/sysAdmin/stores/${row.original.id}`}
					>
						{row.original.name}
					</Link>
				),
			},
			{
				id: "organization",
				header: "Organization",
				cell: ({ row }) => (
					<span className="text-sm">{row.original.Organization.name}</span>
				),
			},
			{
				accessorKey: "ownerId",
				header: "Owner ID",
				cell: ({ row }) => (
					<span className="font-mono text-xs">{row.original.ownerId}</span>
				),
			},
			{
				accessorKey: "defaultCurrency",
				header: "Currency",
			},
			{
				id: "status",
				header: "Status",
				cell: ({ row }) =>
					row.original.isDeleted ? (
						<Badge variant="secondary">Archived</Badge>
					) : (
						<Badge variant="default">Active</Badge>
					),
			},
			{
				id: "edit",
				header: "",
				cell: ({ row }) => (
					<EditSysAdminStoreDialog
						store={row.original}
						onUpdated={handleUpdated}
					/>
				),
			},
			{
				id: "actions",
				cell: ({ row }) => (
					<CellActionSysadminStore
						item={row.original}
						onUpdated={handleUpdated}
					/>
				),
			},
		],
		[handleUpdated],
	);

	const canCreate = organizations.length > 0 && users.length > 0;

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-2">
					<Switch
						id="show-archived-stores"
						checked={showArchived}
						onCheckedChange={setShowArchived}
						className="touch-manipulation"
					/>
					<Label htmlFor="show-archived-stores" className="text-sm">
						Show archived
					</Label>
				</div>
				{canCreate ? (
					<CreateSysAdminStoreDialog
						organizations={organizations}
						users={users}
						onCreated={handleCreated}
					/>
				) : (
					<p className="text-muted-foreground text-sm">
						Add at least one organization and user before creating a store.
					</p>
				)}
			</div>
			<DataTable<SysAdminStoreRow, unknown>
				columns={columns}
				data={filtered}
				searchKey="name"
			/>
		</div>
	);
}
