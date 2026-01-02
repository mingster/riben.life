"use client";

import { IconCopy, IconDots, IconEdit, IconTrash } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/providers/i18n-provider";

import { deleteServiceStaffAction } from "@/actions/storeAdmin/serviceStaff/delete-service-staff";
import type { ServiceStaffColumn } from "../service-staff-column";
import { EditServiceStaffDialog } from "./edit-service-staff-dialog";

interface CellActionProps {
	data: ServiceStaffColumn;
	onDeleted?: (id: string) => void;
	onUpdated?: (serviceStaff: ServiceStaffColumn) => void;
}

export const CellAction: React.FC<CellActionProps> = ({
	data,
	onDeleted,
	onUpdated,
}) => {
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const onConfirm = async () => {
		try {
			setLoading(true);
			const result = await deleteServiceStaffAction(String(params.storeId), {
				id: data.id,
			});

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
				return;
			}

			toastSuccess({
				title: t("service_staff_deleted") || "Service staff deleted",
				description: "",
			});
			onDeleted?.(data.id);
		} catch (error: unknown) {
			toastError({
				title: t("error_title"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setLoading(false);
			setOpen(false);
		}
	};

	const onCopy = (id: string) => {
		navigator.clipboard.writeText(id);
		toastSuccess({
			title:
				t("service_staff_id_copied") || "Service staff ID copied to clipboard.",
			description: "",
		});
	};

	return (
		<>
			<AlertModal
				isOpen={open}
				onClose={() => setOpen(false)}
				onConfirm={onConfirm}
				loading={loading}
			/>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="size-8 p-0">
						<span className="sr-only">Open menu</span>
						<IconDots className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
					<DropdownMenuItem
						className="cursor-pointer"
						onClick={() => onCopy(data.id)}
					>
						<IconCopy className="mr-0 size-4" /> {t("copy_id") || "Copy Id"}
					</DropdownMenuItem>

					<DropdownMenuItem
						className="cursor-pointer"
						onSelect={(event) => {
							event.preventDefault();
							setIsEditOpen(true);
						}}
					>
						<IconEdit className="mr-0 size-4" /> {t("edit")}
					</DropdownMenuItem>
					<DropdownMenuItem
						className="cursor-pointer"
						onClick={() => setOpen(true)}
					>
						<IconTrash className="mr-0 size-4" /> {t("delete")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<EditServiceStaffDialog
				isNew={false}
				serviceStaff={data}
				onUpdated={onUpdated}
				open={isEditOpen}
				onOpenChange={setIsEditOpen}
			/>
		</>
	);
};
