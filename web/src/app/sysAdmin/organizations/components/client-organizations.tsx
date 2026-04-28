"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";

import { DataTable } from "@/components/dataTable";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";

import type { SysAdminOrganizationRow } from "../organization-column";

import { CellActionSysadminOrganization } from "./cell-action-sysadmin-organization";
import {
	CreateSysAdminOrganizationDialog,
	EditSysAdminOrganizationDialog,
} from "./edit-sysadmin-organization-dialog";

interface ClientOrganizationsProps {
	serverOrganizations: SysAdminOrganizationRow[];
}

function formatCreatedAt(iso: string): string {
	try {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return iso;
		return d.toLocaleString();
	} catch {
		return iso;
	}
}

export function ClientOrganizations({
	serverOrganizations,
}: ClientOrganizationsProps) {
	const [data, setData] =
		useState<SysAdminOrganizationRow[]>(serverOrganizations);

	const handleUpdated = useCallback((row: SysAdminOrganizationRow) => {
		setData((prev) =>
			prev.map((o) =>
				o.id === row.id
					? {
							...row,
							storeCount: o.storeCount,
							subscriptionStats: o.subscriptionStats,
						}
					: o,
			),
		);
	}, []);

	const handleCreated = useCallback((row: SysAdminOrganizationRow) => {
		setData((prev) =>
			[...prev, row].sort((a, b) => a.name.localeCompare(b.name)),
		);
	}, []);

	const handleDeleted = useCallback((row: SysAdminOrganizationRow) => {
		setData((prev) => prev.filter((o) => o.id !== row.id));
	}, []);

	const columns: ColumnDef<SysAdminOrganizationRow>[] = useMemo(
		() => [
			{
				accessorKey: "name",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Name" />
				),
				cell: ({ row }) => (
					<span className="font-medium">{row.original.name}</span>
				),
			},
			{
				accessorKey: "slug",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Slug" />
				),
				cell: ({ row }) => (
					<span className="font-mono text-sm">{row.original.slug}</span>
				),
			},
			{
				id: "stores",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Stores" />
				),
				cell: ({ row }) => (
					<span className="tabular-nums">{row.original.storeCount}</span>
				),
			},
			{
				id: "subscriptions",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Subscriptions" />
				),
				cell: ({ row }) => {
					const s = row.original.subscriptionStats;
					return (
						<span className="text-muted-foreground text-xs tabular-nums">
							A{s.active} · I{s.inactive} · C{s.cancelled} · N{s.noSubscription}
						</span>
					);
				},
			},
			{
				id: "created",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Created" />
				),
				cell: ({ row }) => (
					<span className="text-muted-foreground text-sm">
						{formatCreatedAt(row.original.createdAt)}
					</span>
				),
			},
			{
				id: "edit",
				header: "",
				cell: ({ row }) => (
					<EditSysAdminOrganizationDialog
						organization={row.original}
						onUpdated={handleUpdated}
					/>
				),
			},
			{
				id: "actions",
				cell: ({ row }) => (
					<CellActionSysadminOrganization
						item={row.original}
						onDeleted={handleDeleted}
					/>
				),
			},
		],
		[handleUpdated, handleDeleted],
	);

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-end gap-2">
				<CreateSysAdminOrganizationDialog onCreated={handleCreated} />
			</div>
			<DataTable<SysAdminOrganizationRow, unknown>
				columns={columns}
				data={data}
				searchKey="name"
			/>
		</div>
	);
}
