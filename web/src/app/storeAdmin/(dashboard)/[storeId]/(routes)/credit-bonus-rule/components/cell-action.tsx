"use client";

import { IconCopy, IconDots, IconEdit, IconTrash } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { deleteCreditBonusRuleAction } from "@/actions/storeAdmin/credit-bonus-rule/delete-credit-bonus-rule";
import { useTranslation } from "@/app/i18n/client";
import type { CreditBonusRuleColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/credit-bonus-rule/credit-bonus-rule-column";
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

import { EditCreditBonusRuleDialog } from "./edit-credit-bonus-rule-dialog";

interface CellActionProps {
	data: CreditBonusRuleColumn;
	onUpdated?: (rule: CreditBonusRuleColumn) => void;
	onDeleted?: (id: string) => void;
}

export function CellAction({ data, onUpdated, onDeleted }: CellActionProps) {
	const params = useParams<{ storeId: string }>();
	const { t } = useTranslation();

	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);

	const handleDelete = async () => {
		try {
			setLoading(true);
			const result = await deleteCreditBonusRuleAction(String(params.storeId), {
				id: data.id,
			});

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
			} else {
				toastSuccess({
					title: t("credit_bonus_rule_deleted"),
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
			<EditCreditBonusRuleDialog
				rule={data}
				onUpdated={onUpdated}
				open={isEditOpen}
				onOpenChange={setIsEditOpen}
			/>
		</>
	);
}
