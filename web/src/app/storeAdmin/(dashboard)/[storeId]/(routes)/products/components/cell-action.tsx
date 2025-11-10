"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import axios, { type AxiosError } from "axios";
import { IconCopy, IconEdit, IconDots, IconTrash } from "@tabler/icons-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { AlertModal } from "@/components/modals/alert-modal";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { ProductColumn } from "./columns";

interface CellActionProps {
	data: ProductColumn;
	onDeleted?: (productId: string) => void;
}
import { toastError, toastSuccess } from "@/components/toaster";

export const CellAction: React.FC<CellActionProps> = ({ data, onDeleted }) => {
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const router = useRouter();
	const params = useParams();
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const onConfirm = async () => {
		try {
			setLoading(true);
			await axios.delete(
				`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/product/${data.id}`,
			);

			toastSuccess({
				title: t("Product_deleted"),
				description: "",
			});
			onDeleted?.(data.id);
		} catch (error: unknown) {
			const err = error as AxiosError;
			toastError({ title: t("Error"), description: err.message });
		} finally {
			setLoading(false);
			setOpen(false);
		}
	};

	const onCopy = (id: string) => {
		navigator.clipboard.writeText(id);
		toastSuccess({
			title: "Product ID copied to clipboard.",
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
					<DropdownMenuLabel>{t("Actions")}</DropdownMenuLabel>
					<DropdownMenuItem onClick={() => onCopy(data.id)}>
						<IconCopy className="mr-0 size-4" /> Copy Id
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() =>
							router.push(`/storeAdmin/${params.storeId}/products/${data.id}`)
						}
					>
						<IconEdit className="mr-0 size-4" /> {t("Edit")}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setOpen(true)}>
						<IconTrash className="mr-0 size-4" /> {t("Delete")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
};
