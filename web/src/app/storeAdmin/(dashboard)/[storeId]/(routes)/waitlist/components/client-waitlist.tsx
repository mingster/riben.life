"use client";

import {
	IconDots,
	IconPhone,
	IconRefresh,
	IconTrash,
} from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";

import { callWaitlistNumberAction } from "@/actions/storeAdmin/waitlist/call-waitlist-number";
import { cancelWaitlistEntryAction } from "@/actions/storeAdmin/waitlist/cancel-waitlist-entry";
import { listWaitlistAction } from "@/actions/storeAdmin/waitlist/list-waitlist";
import type { ListWaitlistInput } from "@/actions/storeAdmin/waitlist/list-waitlist.validation";
import type { WaitlistListEntry } from "@/actions/storeAdmin/waitlist/waitlist-list-entry";
import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Heading } from "@/components/heading";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { WaitListStatus } from "@/types/waitlist-status";
import { formatDateTime, formatDurationMsShort } from "@/utils/datetime-utils";

type StatusFilter = NonNullable<ListWaitlistInput["statusFilter"]>;
type SessionScope = NonNullable<ListWaitlistInput["sessionScope"]>;

interface Props {
	storeId: string;
	initialEntries: WaitlistListEntry[];
	initialStatusFilter: StatusFilter;
	initialSessionScope: SessionScope;
}

function sessionBlockLabel(block: string, t: (key: string) => string): string {
	const map: Record<string, string> = {
		morning: "waitlist_session_morning",
		afternoon: "waitlist_session_afternoon",
		evening: "waitlist_session_evening",
	};
	const key = map[block];
	return key ? t(key) : block;
}

function statusBadgeVariant(
	status: string,
): "default" | "secondary" | "destructive" | "outline" {
	if (status === WaitListStatus.waiting) {
		return "secondary";
	}
	if (status === WaitListStatus.called) {
		return "default";
	}
	if (status === "seated") {
		return "outline";
	}
	if (
		status === WaitListStatus.cancelled ||
		status === WaitListStatus.no_show
	) {
		return "destructive";
	}
	return "outline";
}

export function ClientWaitlist({
	storeId,
	initialEntries,
	initialStatusFilter,
	initialSessionScope,
}: Props) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [data, setData] = useState<WaitlistListEntry[]>(initialEntries);
	const [statusFilter, setStatusFilter] =
		useState<StatusFilter>(initialStatusFilter);
	const [sessionScope, setSessionScope] =
		useState<SessionScope>(initialSessionScope);
	const [listLoading, setListLoading] = useState(false);
	const [rowActionId, setRowActionId] = useState<string | null>(null);
	const [cancelTarget, setCancelTarget] = useState<WaitlistListEntry | null>(
		null,
	);
	const [cancelLoading, setCancelLoading] = useState(false);

	const loadList = useCallback(
		async (sf: StatusFilter, ss: SessionScope) => {
			setListLoading(true);
			try {
				const result = await listWaitlistAction(storeId, {
					statusFilter: sf,
					sessionScope: ss,
				});
				if (result?.serverError) {
					toastError({ description: result.serverError });
					return;
				}
				setData(result?.data?.entries ?? []);
			} finally {
				setListLoading(false);
			}
		},
		[storeId],
	);

	const handleCall = useCallback(
		async (entry: WaitlistListEntry) => {
			setRowActionId(entry.id);
			try {
				const result = await callWaitlistNumberAction(storeId, {
					waitlistId: entry.id,
				});
				if (result?.serverError) {
					toastError({ description: result.serverError });
					return;
				}
				toastSuccess({ description: t("waitlist_status_called") });
				await loadList(statusFilter, sessionScope);
			} finally {
				setRowActionId(null);
			}
		},
		[loadList, statusFilter, sessionScope, storeId, t],
	);

	const confirmCancel = useCallback(async () => {
		if (!cancelTarget) {
			return;
		}
		setCancelLoading(true);
		try {
			const result = await cancelWaitlistEntryAction(storeId, {
				waitlistId: cancelTarget.id,
			});
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			toastSuccess({ description: t("waitlist_cancelled_success") });
			setCancelTarget(null);
			await loadList(statusFilter, sessionScope);
		} finally {
			setCancelLoading(false);
		}
	}, [cancelTarget, loadList, statusFilter, sessionScope, storeId, t]);

	const columns: ColumnDef<WaitlistListEntry>[] = useMemo(
		() => [
			{
				accessorKey: "queueNumber",
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t("waitlist_queue_number")}
					/>
				),
				cell: ({ row }) => (
					<span className="font-mono font-medium">
						#{row.original.queueNumber}
					</span>
				),
			},
			{
				accessorKey: "sessionBlock",
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t("waitlist_session_column")}
					/>
				),
				cell: ({ row }) => (
					<span className="text-sm">
						{sessionBlockLabel(row.original.sessionBlock, t)}
					</span>
				),
			},
			{
				id: "party",
				header: t("waitlist_party_size"),
				cell: ({ row }) => (
					<span className="text-sm">
						{t("waitlist_party_adults")}: {row.original.numOfAdult} ·{" "}
						{t("waitlist_party_children")}: {row.original.numOfChild}
					</span>
				),
			},
			{
				id: "contact",
				header: t("store_admin_waitlist_contact"),
				cell: ({ row }) => {
					const name = [row.original.name, row.original.lastName]
						.filter(Boolean)
						.join(" ");
					const phone = row.original.phone ?? "";
					return (
						<div className="flex flex-col gap-0.5 text-sm">
							{name ? <span>{name}</span> : null}
							{phone ? (
								<span className="text-muted-foreground">{phone}</span>
							) : null}
							{!name && !phone ? (
								<span className="text-muted-foreground">—</span>
							) : null}
						</div>
					);
				},
			},
			{
				accessorKey: "status",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("waitlist_status")} />
				),
				cell: ({ row }) => {
					const s = row.original.status;
					const labelKey =
						s === WaitListStatus.waiting
							? "waitlist_status_waiting"
							: s === WaitListStatus.called
								? "waitlist_status_called"
								: s === "seated"
									? "waitlist_status_seated"
									: s === WaitListStatus.cancelled
										? "waitlist_status_cancelled"
										: null;
					return (
						<Badge variant={statusBadgeVariant(s)}>
							{labelKey ? t(labelKey) : s}
						</Badge>
					);
				},
			},
			{
				accessorKey: "createdAt",
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t("waitlist_created_at")}
					/>
				),
				cell: ({ row }) => (
					<span className="font-mono text-xs text-muted-foreground">
						{formatDateTime(new Date(row.original.createdAt))}
					</span>
				),
			},
			{
				id: "waitTime",
				header: t("waitlist_wait_time_column"),
				cell: ({ row }) => {
					const ms = row.original.waitTimeMs;
					if (ms == null || ms === undefined) {
						return <span className="text-muted-foreground">—</span>;
					}
					return <span className="text-sm">{formatDurationMsShort(ms)}</span>;
				},
			},
			{
				id: "notifiedAt",
				header: t("store_admin_waitlist_notified_at"),
				cell: ({ row }) => {
					const n = row.original.notifiedAt;
					if (n == null) {
						return <span className="text-muted-foreground">—</span>;
					}
					return (
						<span className="font-mono text-xs text-muted-foreground">
							{formatDateTime(new Date(n))}
						</span>
					);
				},
			},
			{
				id: "actions",
				cell: ({ row }) => {
					const entry = row.original;
					const canAct = entry.status === WaitListStatus.waiting;
					const busy = rowActionId === entry.id;
					return (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									className="size-8 p-0"
									disabled={busy || !canAct}
									aria-label={t("waitlist_mgmt_actions_column")}
								>
									<IconDots className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuLabel>
									{t("waitlist_mgmt_actions_column")}
								</DropdownMenuLabel>
								<DropdownMenuItem
									disabled={!canAct || busy}
									onClick={() => void handleCall(entry)}
								>
									<IconPhone className="mr-2 size-4" />
									{t("waitlist_mgmt_call")}
								</DropdownMenuItem>
								<DropdownMenuItem
									disabled={!canAct || busy}
									onClick={() => setCancelTarget(entry)}
								>
									<IconTrash className="mr-2 size-4" />
									{t("waitlist_mgmt_cancel")}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					);
				},
			},
		],
		[handleCall, rowActionId, t],
	);

	return (
		<div className="space-y-4">
			<AlertModal
				isOpen={Boolean(cancelTarget)}
				onClose={() => setCancelTarget(null)}
				onConfirm={() => void confirmCancel()}
				loading={cancelLoading}
				title={t("waitlist_mgmt_cancel")}
				description={t("store_admin_waitlist_cancel_confirm")}
			/>
			<div className="flex flex-col gap-0.5 text-balance">
				<Heading
					title={t("waitlist_mgmt")}
					badge={data.length}
					description={t("store_admin_waitlist_page_descr")}
				/>
			</div>
			<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
				<div className="flex flex-col gap-0.5">
					<Label className="text-xs text-muted-foreground">
						{t("store_admin_waitlist_status_filter")}
					</Label>
					<Select
						value={statusFilter}
						onValueChange={(v) => {
							const next = v as StatusFilter;
							setStatusFilter(next);
							void loadList(next, sessionScope);
						}}
						disabled={listLoading}
					>
						<SelectTrigger className="w-[200px] sm:w-[220px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">
								{t("store_admin_waitlist_status_filter_all")}
							</SelectItem>
							<SelectItem value={WaitListStatus.waiting}>
								{t("waitlist_status_waiting")}
							</SelectItem>
							<SelectItem value={WaitListStatus.called}>
								{t("waitlist_status_called")}
							</SelectItem>
							<SelectItem value={WaitListStatus.cancelled}>
								{t("waitlist_status_cancelled")}
							</SelectItem>
							<SelectItem value={WaitListStatus.no_show}>
								{t("waitlist_status_no_show")}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex flex-col gap-0.5">
					<Label className="text-xs text-muted-foreground">
						{t("store_admin_waitlist_session_filter")}
					</Label>
					<Select
						value={sessionScope}
						onValueChange={(v) => {
							const next = v as SessionScope;
							setSessionScope(next);
							void loadList(statusFilter, next);
						}}
						disabled={listLoading}
					>
						<SelectTrigger className="w-[200px] sm:w-[220px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="current_session">
								{t("waitlist_scope_current_session")}
							</SelectItem>
							<SelectItem value="today">{t("waitlist_scope_today")}</SelectItem>
							<SelectItem value="all">{t("waitlist_scope_all")}</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="sm:mb-0.5"
					disabled={listLoading}
					onClick={() => void loadList(statusFilter, sessionScope)}
				>
					<IconRefresh
						className={`mr-2 size-4 ${listLoading ? "animate-spin" : ""}`}
					/>
					{t("waitlist_mgmt_refresh")}
				</Button>
			</div>
			<Separator />
			<DataTable<WaitlistListEntry, unknown>
				columns={columns}
				data={data}
				noSearch
			/>
		</div>
	);
}
