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

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { MessageColumn } from "./columns";
import { toastError, toastSuccess } from "@/components/toaster";

interface CellActionProps {
	data: MessageColumn;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const router = useRouter();
	const params = useParams();
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const onConfirm = async () => {
		const url = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/announcement/${data.id}`;
		//console.log(url);

		await axios.delete(url);

		try {
			setLoading(true);

			toastSuccess({
				title: t("Announcement_deleted"),
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
					<DropdownMenuLabel>Actions</DropdownMenuLabel>
					<DropdownMenuItem
						className="cursor-pointer"
						onClick={() => onCopy(data.id)}
					>
						<Copy className="mr-0 size-4" /> Copy Id
					</DropdownMenuItem>

					<DropdownMenuItem
						className="cursor-pointer"
						onClick={() =>
							router.push(
								`/storeAdmin/${params.storeId}/announcements/${data.id}`,
							)
						}
					>
						<Edit className="mr-0 size-4" />
						{t("Update")}
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
