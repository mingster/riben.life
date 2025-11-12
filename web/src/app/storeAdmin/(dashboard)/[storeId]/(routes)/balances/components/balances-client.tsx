"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Heading } from "@/components/ui/heading";

import { DataTable } from "@/components/dataTable";
import { Separator } from "@/components/ui/separator";
import type { Store } from "@/types";
import { type StoreLedgerColumn, columns } from "./columns";

interface StoreOrderClientProps {
	store: Store;
	data: StoreLedgerColumn[];
}

export const BalancesClient: React.FC<StoreOrderClientProps> = ({
	store,
	data,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	return (
		<>
			<Heading title={t("Balances")} badge={data.length} description="" />

			<div className="grid grid-cols-2 justify-between pb-2">
				<div className="flex gap-1 items-center" />
				<div className="flex gap-1 items-center">
					{/* render date filter descr */}
					<div className="flex gap-1 text-xs font-mono" />
				</div>
			</div>
			<Separator />
			<DataTable searchKey="" columns={columns} data={data} />
		</>
	);
};
