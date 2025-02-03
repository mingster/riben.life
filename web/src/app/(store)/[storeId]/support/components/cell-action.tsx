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

import { toast } from "@/components/ui/use-toast";
import type { TicketColumn } from "./columns";

interface CellActionProps {
	data: TicketColumn;
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
				`${process.env.NEXT_PUBLIC_API_URL}/store/${params.storeId}/ticket/${data.id}`,
			);

			toast({
				title: "ticket deleted.",
				description: "",
				variant: "success",
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
			title: "Ticket ID copied to clipboard.",
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
					<Button variant="ghost" className="size-8 p-0 cursor-pointer">
						<span className="sr-only">Open menu</span>
						<MoreHorizontal className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuLabel>Actions</DropdownMenuLabel>
					<DropdownMenuItem
						className=" cursor-pointer"
						onClick={() => onCopy(data.id)}
					>
						<Copy className="mr-0 size-4" /> Copy Id
					</DropdownMenuItem>
					<DropdownMenuItem
						className=" cursor-pointer"
						onClick={() => router.push(`/${params.storeId}/support/${data.id}`)}
					>
						<Edit className="mr-0 size-4" /> Reply
					</DropdownMenuItem>
					<DropdownMenuItem
						className=" cursor-pointer"
						onClick={() => setOpen(true)}
					>
						<Trash className="mr-0 size-4" /> Archive
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
};
