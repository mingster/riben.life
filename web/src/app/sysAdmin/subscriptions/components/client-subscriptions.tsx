"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo } from "react";

import { DataTable } from "@/components/dataTable";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Button } from "@/components/ui/button";
import type { SysAdminSubscriptionRow } from "../subscription-row";
import { formatDateTime } from "@/utils/datetime-utils";

function formatEpochMs(ms: number): string {
	if (!Number.isFinite(ms) || ms <= 0) {
		return "—";
	}
	return formatDateTime(new Date(ms)) || "—";
}

export function ClientSubscriptions({
	rows,
}: {
	rows: SysAdminSubscriptionRow[];
}) {
	const columns: ColumnDef<SysAdminSubscriptionRow>[] = useMemo(
		() => [
			{
				accessorKey: "storeName",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Store" />
				),
				cell: ({ row }) => {
					const r = row.original;
					return (
						<Link
							href={`/sysAdmin/stores/${r.storeId}`}
							className="text-primary font-medium hover:underline"
						>
							{r.storeName}
						</Link>
					);
				},
			},
			{
				accessorKey: "userEmail",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Owner" />
				),
				cell: ({ row }) => {
					const r = row.original;
					const label = r.userEmail ?? r.userName ?? r.userId;
					if (r.userEmail) {
						return (
							<Link
								href={`/sysAdmin/users/${encodeURIComponent(r.userEmail)}`}
								className="text-primary hover:underline"
							>
								{label}
							</Link>
						);
					}
					return (
						<span className="text-muted-foreground font-mono text-sm">
							{label}
						</span>
					);
				},
			},
			{
				accessorKey: "statusLabel",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Status" />
				),
			},
			{
				accessorKey: "billingProvider",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Provider" />
				),
			},
			{
				accessorKey: "expiration",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Expiration" />
				),
				cell: ({ row }) => formatEpochMs(row.original.expiration),
			},
			{
				accessorKey: "updatedAt",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Updated" />
				),
				cell: ({ row }) => formatEpochMs(row.original.updatedAt),
			},
			{
				id: "stripe",
				header: "Stripe",
				cell: ({ row }) => {
					const id = row.original.subscriptionId;
					if (!id) {
						return <span className="text-muted-foreground">—</span>;
					}
					return (
						<Button variant="outline" size="sm" asChild>
							<a
								href={`https://dashboard.stripe.com/subscriptions/${id}`}
								target="_blank"
								rel="noreferrer"
							>
								Open
							</a>
						</Button>
					);
				},
			},
		],
		[],
	);

	return (
		<DataTable<SysAdminSubscriptionRow, unknown>
			columns={columns}
			data={rows}
			searchKey="storeName"
		/>
	);
}
