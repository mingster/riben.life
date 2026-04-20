"use client";

import { IconPlus, IconTrash } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import { createRsvpBlacklistAction } from "@/actions/storeAdmin/rsvp-blacklist/create-rsvp-blacklist";
import { deleteRsvpBlacklistAction } from "@/actions/storeAdmin/rsvp-blacklist/delete-rsvp-blacklist";
import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Loader } from "@/components/loader";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { UserCombobox } from "@/components/user-combobox";
import { useI18n } from "@/providers/i18n-provider";
import { epochToDate } from "@/utils/datetime-utils";

import type { RsvpBlacklistColumn } from "./rsvp-blacklist-column";

interface Props {
	storeId: string;
	rows: RsvpBlacklistColumn[];
	onRowsChange: (rows: RsvpBlacklistColumn[]) => void;
}

export function RsvpBlacklistTable({ storeId, rows, onRowsChange }: Props) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [addOpen, setAddOpen] = useState(false);
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
	const [adding, setAdding] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);

	const handleAddOpenChange = useCallback((open: boolean) => {
		setAddOpen(open);
		if (!open) {
			setSelectedUserId(null);
		}
	}, []);

	const searchBlacklistUsers = useCallback(
		async (query: string) => {
			const res = await fetch(
				`/api/storeAdmin/${encodeURIComponent(storeId)}/users/search?q=${encodeURIComponent(query)}`,
				{ credentials: "include" },
			);
			if (!res.ok) {
				return [];
			}
			const data = (await res.json()) as {
				users: Array<{
					id: string;
					name: string | null;
					email: string | null;
					phoneNumber: string | null;
				}>;
			};
			const blocked = new Set(rows.map((r) => r.userId));
			return data.users.filter((u) => !blocked.has(u.id));
		},
		[storeId, rows],
	);

	const handleAdd = useCallback(async () => {
		const uid = selectedUserId?.trim();
		if (!uid) {
			toastError({
				description: t("store_admin_rsvp_blacklist_user_required"),
			});
			return;
		}
		setAdding(true);
		try {
			const result = await createRsvpBlacklistAction(storeId, { userId: uid });
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			if (result?.data?.blacklist) {
				onRowsChange([result.data.blacklist, ...rows]);
			}
			toastSuccess({ description: t("store_admin_rsvp_blacklist_added") });
			setSelectedUserId(null);
			setAddOpen(false);
		} catch (err: unknown) {
			toastError({
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setAdding(false);
		}
	}, [storeId, selectedUserId, rows, onRowsChange, t]);

	const confirmDelete = useCallback(async () => {
		if (!deleteId) return;
		setDeleting(true);
		try {
			const result = await deleteRsvpBlacklistAction(storeId, { id: deleteId });
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			onRowsChange(rows.filter((r) => r.id !== deleteId));
			toastSuccess({ description: t("deleted") });
			setDeleteId(null);
		} catch (err: unknown) {
			toastError({
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setDeleting(false);
		}
	}, [deleteId, storeId, rows, onRowsChange, t]);

	const columns = useMemo<ColumnDef<RsvpBlacklistColumn>[]>(
		() => [
			{
				accessorKey: "userEmail",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("email")} />
				),
				cell: ({ row }) => row.original.userEmail ?? "—",
			},
			{
				accessorKey: "userName",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("name")} />
				),
				cell: ({ row }) => row.original.userName ?? "—",
			},
			{
				accessorKey: "userId",
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t("store_admin_rsvp_blacklist_user_id_label")}
					/>
				),
				cell: ({ row }) => (
					<span className="font-mono text-xs">{row.original.userId}</span>
				),
			},
			{
				id: "createdAt",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("created_at")} />
				),
				cell: ({ row }) => {
					const d = epochToDate(row.original.createdAt);
					return d ? format(d, "yyyy-MM-dd HH:mm") : "—";
				},
			},
			{
				id: "actions",
				cell: ({ row }) => (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-10 w-10 sm:h-8 sm:w-8 touch-manipulation"
						onClick={() => setDeleteId(row.original.id)}
						aria-label={t("delete")}
					>
						<IconTrash className="size-4 text-destructive" />
					</Button>
				),
			},
		],
		[t],
	);

	return (
		<>
			<Card>
				<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
					<div>
						<CardTitle>{t("store_admin_rsvp_blacklist_title")}</CardTitle>
						<CardDescription className="text-xs font-mono text-gray-500">
							{t("store_admin_rsvp_blacklist_descr")}
						</CardDescription>
					</div>
					<Dialog open={addOpen} onOpenChange={handleAddOpenChange}>
						<DialogTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								className="touch-manipulation"
							>
								<IconPlus className="mr-2 size-4" />
								{t("add")}
							</Button>
						</DialogTrigger>
						<DialogContent aria-busy={adding} aria-disabled={adding}>
							<div className="relative">
								{adding ? (
									<div
										className="absolute inset-0 z-50 flex cursor-wait select-none items-center justify-center rounded-md bg-background/80 backdrop-blur-[2px]"
										aria-live="polite"
										aria-label={t("submitting")}
									>
										<Loader />
									</div>
								) : null}
								<DialogHeader>
									<DialogTitle>
										{t("store_admin_rsvp_blacklist_add_title")}
									</DialogTitle>
									<DialogDescription>
										{t("store_admin_rsvp_blacklist_add_descr")}
									</DialogDescription>
								</DialogHeader>
								<div className="space-y-2">
									<Label htmlFor="blacklist-user-combobox-trigger">
										{t("store_admin_rsvp_blacklist_select_user_label")}{" "}
										<span className="text-destructive">*</span>
									</Label>
									<UserCombobox
										id="blacklist-user-combobox-trigger"
										users={[]}
										value={selectedUserId}
										onValueChange={(id) => setSelectedUserId(id)}
										disabled={adding}
										onSearch={searchBlacklistUsers}
										commandInputPlaceholder={t(
											"store_admin_rsvp_blacklist_search_placeholder",
										)}
									/>
								</div>
								<DialogFooter>
									<Button
										type="button"
										variant="outline"
										onClick={() => setAddOpen(false)}
										disabled={adding}
									>
										{t("cancel")}
									</Button>
									<Button
										type="button"
										onClick={() => void handleAdd()}
										disabled={adding}
									>
										{t("add")}
									</Button>
								</DialogFooter>
							</div>
						</DialogContent>
					</Dialog>
				</CardHeader>
				<CardContent>
					<DataTable columns={columns} data={rows} searchKey="userEmail" />
				</CardContent>
			</Card>

			<AlertModal
				isOpen={Boolean(deleteId)}
				onClose={() => setDeleteId(null)}
				onConfirm={() => void confirmDelete()}
				loading={deleting}
			/>
		</>
	);
}
