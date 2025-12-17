"use client";

import { deleteCurrencyAction } from "@/actions/sysAdmin/currency/delete-currency";
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
import { useState } from "react";
import type { CurrencyColumn } from "../currency-column";
import { EditCurrencyDialog } from "./edit-currency-dialog";

interface CellActionProps {
	data: CurrencyColumn;
	onUpdated?: (currency: CurrencyColumn) => void;
	onDeleted?: (id: string) => void;
}

export function CellAction({ data, onUpdated, onDeleted }: CellActionProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "sysAdmin");

	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);

	const handleDelete = async () => {
		try {
			setLoading(true);
			const result = await deleteCurrencyAction({
				id: data.id,
			});

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
			} else {
				toastSuccess({
					title: "Currency deleted",
					description: "",
				});
				onDeleted?.(data.id);
			}
		} catch (error: unknown) {
			toastError({
				title: t("error_title"),
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
				title: t("copy"),
				description: data.id,
			});
		} catch (error: unknown) {
			toastError({
				title: t("error_title"),
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
					<DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
					<DropdownMenuItem onClick={handleCopy}>
						<IconCopy className="mr-0 size-4" /> {t("copy")}
					</DropdownMenuItem>
					<DropdownMenuItem
						onSelect={(event) => {
							event.preventDefault();
							setIsEditOpen(true);
						}}
					>
						<IconEdit className="mr-0 size-4" /> {t("edit")}
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => setIsConfirmOpen(true)}
						className="text-red-600 focus:text-red-600"
					>
						<IconTrash className="mr-0 size-4" /> {t("delete")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<EditCurrencyDialog
				currency={data}
				onUpdated={onUpdated}
				open={isEditOpen}
				onOpenChange={setIsEditOpen}
			/>
		</>
	);
}
