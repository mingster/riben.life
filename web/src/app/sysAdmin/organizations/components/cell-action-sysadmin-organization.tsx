"use client";

import { IconCopy, IconDots, IconTrash } from "@tabler/icons-react";
import { useState } from "react";

import { deleteSysAdminOrganizationAction } from "@/actions/sysAdmin/organization/delete-sysadmin-organization";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { SysAdminOrganizationRow } from "../organization-column";

interface CellActionSysadminOrganizationProps {
	item: SysAdminOrganizationRow;
	onDeleted: (item: SysAdminOrganizationRow) => void;
}

export function CellActionSysadminOrganization({
	item,
	onDeleted,
}: CellActionSysadminOrganizationProps) {
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const onConfirmDelete = async () => {
		setLoading(true);
		try {
			const result = await deleteSysAdminOrganizationAction({ id: item.id });
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			onDeleted(item);
			toastSuccess({ description: "Organization deleted." });
		} finally {
			setLoading(false);
			setDeleteOpen(false);
		}
	};

	return (
		<>
			<AlertModal
				isOpen={deleteOpen}
				onClose={() => setDeleteOpen(false)}
				onConfirm={onConfirmDelete}
				loading={loading}
			/>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="size-8 p-0 touch-manipulation">
						<IconDots className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuLabel>Actions</DropdownMenuLabel>
					<DropdownMenuItem
						className="cursor-pointer"
						onClick={() => void navigator.clipboard.writeText(item.id)}
					>
						<IconCopy className="mr-2 size-4" />
						Copy ID
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className="cursor-pointer text-destructive focus:text-destructive"
						disabled={loading || item.storeCount > 0}
						onClick={() => setDeleteOpen(true)}
					>
						<IconTrash className="mr-2 size-4" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}
