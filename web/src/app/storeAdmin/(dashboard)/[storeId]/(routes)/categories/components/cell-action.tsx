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

import { toastError, toastSuccess } from "@/components/toaster";

import type { CategoryColumn } from "./columns";

interface CellActionProps {
	data: CategoryColumn;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const router = useRouter();
	const params = useParams();

	const onConfirm = async () => {
		try {
			setLoading(true);

			await axios.delete(
				`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/categories/${data.categoryId}`,
			);

			toastSuccess({
				title: "category deleted.",
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
			title: "CategoryID copied to clipboard.",
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
						onClick={() => onCopy(data.categoryId)}
					>
						<Copy className="mr-0 size-4" /> Copy Id
					</DropdownMenuItem>

					<DropdownMenuItem
						className="cursor-pointer"
						onClick={() =>
							router.push(
								`/storeAdmin/${params.storeId}/categories/${data.categoryId}`,
							)
						}
					>
						<Edit className="mr-0 size-4" /> Update
					</DropdownMenuItem>
					<DropdownMenuItem
						{...(data.numOfProducts !== 0 && { disabled: true })}
						className="cursor-pointer"
						onClick={() => setOpen(true)}
					>
						<Trash className="mr-0 size-4" /> Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
};
