"use client";

import { IconCopy, IconDots, IconTrash } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { deleteProductAction } from "@/actions/storeAdmin/product/delete-product";
import { useTranslation } from "@/app/i18n/client";
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
import { useI18n } from "@/providers/i18n-provider";

import type { ProductColumn } from "../product-column";

interface CellActionProps {
	item: ProductColumn;
	onDeleted?: (item: ProductColumn) => void;
}

export function CellAction({ item, onDeleted }: CellActionProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);

	const onConfirm = async () => {
		try {
			setLoading(true);
			const result = await deleteProductAction(String(params.storeId), {
				productId: item.id,
			});
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			toastSuccess({ description: t("product_deleted") });
			onDeleted?.(item);
		} catch (err: unknown) {
			toastError({
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setLoading(false);
			setOpen(false);
		}
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
					<Button variant="ghost" className="size-8 p-0 touch-manipulation">
						<IconDots className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
					<DropdownMenuItem
						className="cursor-pointer"
						onClick={async () => {
							try {
								await navigator.clipboard.writeText(item.id);
								toastSuccess({
									title: t("copy"),
									description: item.id,
								});
							} catch (err: unknown) {
								toastError({
									description: err instanceof Error ? err.message : String(err),
								});
							}
						}}
					>
						<IconCopy className="mr-2 size-4" />
						{t("copy_id")}
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className="cursor-pointer text-destructive"
						onClick={() => setOpen(true)}
					>
						<IconTrash className="mr-2 size-4" />
						{t("delete")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}
