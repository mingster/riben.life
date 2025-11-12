"use client";

import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toastSuccess } from "@/components/toaster";
import { useI18n } from "@/providers/i18n-provider";
import { OrderStatus } from "@/types/enum";
import { IconCopy, IconDots, IconEdit, IconRefresh } from "@tabler/icons-react";
import Link from "next/link";
import type { TransactionColumn } from "../transaction-column";

interface CellActionProps {
	data: TransactionColumn;
}

export function CellAction({ data }: CellActionProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const handleCopy = (value: string) => {
		void navigator.clipboard.writeText(value);
		toastSuccess({
			title: t("Copy"),
			description: value,
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="size-8 p-0">
					<span className="sr-only">Open menu</span>
					<IconDots className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>{t("Actions")}</DropdownMenuLabel>
				<DropdownMenuItem onClick={() => handleCopy(data.id)}>
					<IconCopy className="mr-0 size-4" /> {t("Copy")}
				</DropdownMenuItem>
				{data.isPaid && (
					<DropdownMenuItem asChild>
						<Link
							className="flex items-center gap-2"
							href={`/storeAdmin/${data.storeId}/order/${data.id}/refund`}
						>
							<IconRefresh className="size-4" />
							{t("Refund")}
						</Link>
					</DropdownMenuItem>
				)}
				{data.orderStatus === OrderStatus.Pending && (
					<DropdownMenuItem asChild>
						<Link
							className="flex items-center gap-2"
							href={`/storeAdmin/${data.storeId}/order/${data.id}`}
						>
							<IconEdit className="size-4" />
							{t("Modify")}
						</Link>
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
