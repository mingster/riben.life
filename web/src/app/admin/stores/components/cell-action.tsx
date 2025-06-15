"use client";

import axios, { type AxiosError } from "axios";
import { Copy, Edit, MoreHorizontal, Trash } from "lucide-react";
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

import type { StoreColumn } from "./columns";

interface CellActionProps {
	data: StoreColumn;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const router = useRouter();
	const _params = useParams();

	const onConfirm = async () => {
		try {
			setLoading(true);
			//await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/admin/${params.storeId}/stores/${data.id}`);

			toast({
				title: "not yet implement",
				description: "",
				variant: "destructive",
			});
			router.refresh();
		} catch (error: unknown) {
			const err = error as AxiosError;
			toast({
				title: "something wrong.",
				description: err.message,
				variant: "destructive",
			});
		} finally {
			setLoading(false);
			setOpen(false);
		}
	};

	const onCopy = (id: string) => {
		navigator.clipboard.writeText(id);
		toast({
			title: "User ID copied to clipboard.",
			description: "",
			variant: "success",
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
					<DropdownMenuItem onClick={() => onCopy(data.id)}>
						<Copy className="mr-0 size-4" /> Copy Id
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => router.push(`/admin/stores/${data.id}`)}
					>
						<Edit className="mr-0 size-4" /> Update
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setOpen(true)}>
						<Trash className="mr-0 size-4" /> Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
};
