"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { Copy, MoreHorizontal, PenBoxIcon, Undo2Icon } from "lucide-react";
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

import { OrderStatus } from "@/types/enum";
import Link from "next/link";
import type { StoreOrderColumn } from "./columns";
import { toastSuccess } from "@/components/Toaster";

interface CellActionProps {
	data: StoreOrderColumn;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const router = useRouter();
	const params = useParams();
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const onConfirm = async () => {
		//try {
		setLoading(true);
		router.push(`/storeAdmin/${params.storeId}/order/${data.id}/refund`);
		/*} catch (error: unknown) {
	  const err = error as AxiosError;
	  toastError({
		title: "something wrong.",
		description: err.message,
	  });
	} finally {
	}*/

		setLoading(false);
		setOpen(false);
	};

	const onCopy = (id: string) => {
		navigator.clipboard.writeText(id);
		toastSuccess({
			title: "Transaction ID copied to clipboard.",
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
					<DropdownMenuItem onClick={() => onCopy(data.id)}>
						<Copy className="mr-0 size-4" /> Copy Id
					</DropdownMenuItem>
					{data.isPaid === true && (
						<DropdownMenuItem onClick={() => setOpen(true)}>
							<Button className="text-xs" variant={"outline"}>
								<Link
									className="flex gap-1"
									href={`/storeAdmin/${data.storeId}/order/${data.id}/refund`}
								>
									<Undo2Icon className="mr-0 size-4" />
									{t("Refund")}
								</Link>
							</Button>
						</DropdownMenuItem>
					)}

					{data.orderStatus === OrderStatus.Pending && (
						<DropdownMenuItem onClick={() => setOpen(true)}>
							<Button className="text-xs" variant={"outline"}>
								<Link
									className="flex gap-1"
									href={`/storeAdmin/${data.storeId}/order/${data.id}`}
								>
									<PenBoxIcon className="mr-0 size-4" />
									{t("Modify")}
								</Link>
							</Button>
						</DropdownMenuItem>
					)}

					{/*
          <DropdownMenuItem
            onClick={() =>
              router.push(`/storeAdmin/${params.storeId}/products/${data.id}`)
            }
          >
            <Edit className="mr-1 h-4 w-4" /> {t("Edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Trash className="mr-1 h-4 w-4" /> {t("Delete")}
          </DropdownMenuItem>
          */}
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
};
