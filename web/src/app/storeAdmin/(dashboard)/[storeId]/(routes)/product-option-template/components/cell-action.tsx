"use client";

import { deleteProductOptionTemplateAction } from "@/actions/storeAdmin/product-option-template/delete-product-option-template";
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
import { IconCopy, IconDots, IconEdit, IconTrash } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { ProductOptionTemplateColumn } from "../product-option-template-column";
import { EditProductOptionTemplateDialog } from "./edit-product-option-template-dialog";

interface CellActionProps {
	data: ProductOptionTemplateColumn;
	onUpdated?: (template: ProductOptionTemplateColumn) => void;
	onDeleted?: (id: string) => void;
}

export function CellAction({ data, onUpdated, onDeleted }: CellActionProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);

	const handleDelete = async () => {
		try {
			setLoading(true);
			const result = await deleteProductOptionTemplateAction({
				storeId: String(params.storeId),
				id: data.id,
			});

			if (result?.serverError) {
				toastError({
					title: t("Error"),
					description: result.serverError,
				});
			} else {
				toastSuccess({
					title: `${t("ProductOption_template")} ${t("Deleted")}`,
					description: "",
				});
				onDeleted?.(data.id);
			}
		} catch (error: unknown) {
			toastError({
				title: t("Error"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setLoading(false);
			setIsConfirmOpen(false);
		}
	};

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(data.id);
			toastSuccess({
				title: t("Copy"),
				description: data.id,
			});
		} catch (error: unknown) {
			toastError({
				title: t("Error"),
				description: error instanceof Error ? error.message : String(error),
			});
		}
	};

	return (
		<>
			<AlertModal
				isOpen={isConfirmOpen}
				onClose={() => setIsConfirmOpen(false)}
				onConfirm={handleDelete}
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
					<DropdownMenuLabel>{t("Actions")}</DropdownMenuLabel>
					<DropdownMenuItem onClick={handleCopy}>
						<IconCopy className="mr-0 size-4" /> {t("Copy")}
					</DropdownMenuItem>
					<DropdownMenuItem
						onSelect={(event) => {
							event.preventDefault();
							setIsEditOpen(true);
						}}
					>
						<IconEdit className="mr-0 size-4" /> {t("Edit")}
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => setIsConfirmOpen(true)}
						className="text-red-600 focus:text-red-600"
					>
						<IconTrash className="mr-0 size-4" /> {t("Delete")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<EditProductOptionTemplateDialog
				template={data}
				onUpdated={onUpdated}
				open={isEditOpen}
				onOpenChange={setIsEditOpen}
			/>
		</>
	);
}
