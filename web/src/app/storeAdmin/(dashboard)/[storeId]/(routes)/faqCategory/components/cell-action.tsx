"use client";

import axios, { type AxiosError } from "axios";
import { Copy, Edit, MoreHorizontal, Trash, UserRoundPen } from "lucide-react";
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

import type { FaqCategoryColumn } from "./columns";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

interface CellActionProps {
	data: FaqCategoryColumn;
}
import { toastError, toastSuccess } from "@/components/toaster";

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const router = useRouter();
	const params = useParams();

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const onConfirm = async () => {
		try {
			setLoading(true);

			await axios.delete(
				`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/faqCategory/${data.faqCategoryId}`,
			);

			toastSuccess({
				title: t("FaqCategory") + t("Deleted"),
				description: "",
			});
			router.refresh();
		} catch (error: unknown) {
			const err = error as AxiosError;
			toastError({
				title: "something wrong.",
				description: err.message,
			});
		} finally {
			setLoading(false);
			setOpen(false);
		}
	};

	const onCopy = (id: string) => {
		navigator.clipboard.writeText(id);
		toastSuccess({
			title: "ID copied to clipboard.",
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
						<MoreHorizontal className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuLabel>{t("Actions")}</DropdownMenuLabel>
					<DropdownMenuItem
						className="cursor-pointer"
						onClick={() => onCopy(data.faqCategoryId)}
					>
						<Copy className="mr-0 size-4" /> Copy Id
					</DropdownMenuItem>

					<DropdownMenuItem
						className="cursor-pointer"
						onClick={() =>
							router.push(
								`/storeAdmin/${params.storeId}/faqCategory/${data.faqCategoryId}/faq/new`,
							)
						}
					>
						<UserRoundPen className="mr-0 size-4" /> {t("FaqCategory_AddFaq")}
					</DropdownMenuItem>

					<DropdownMenuItem
						className="cursor-pointer"
						onClick={() =>
							router.push(
								`/storeAdmin/${params.storeId}/faqCategory/${data.faqCategoryId}`,
							)
						}
					>
						<Edit className="mr-0 size-4" /> {t("Edit")}
					</DropdownMenuItem>
					<DropdownMenuItem
						className="cursor-pointer"
						onClick={() => setOpen(true)}
					>
						<Trash className="mr-0 size-4" /> {t("Delete")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
};
