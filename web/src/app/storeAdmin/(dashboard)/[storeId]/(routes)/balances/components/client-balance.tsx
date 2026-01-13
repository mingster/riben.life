"use client";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { useEffect, useMemo, useState } from "react";
import type { BalanceColumn } from "../balance-column";
import { createBalanceColumns } from "./columns";

interface BalanceClientProps {
	serverData: BalanceColumn[];
}

const sortBalances = (items: BalanceColumn[]) =>
	[...items].sort(
		(a, b) =>
			new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime(),
	);

export function BalanceClient({ serverData }: BalanceClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const [data, setData] = useState<BalanceColumn[]>(() =>
		sortBalances(serverData),
	);

	useEffect(() => {
		setData(sortBalances(serverData));
	}, [serverData]);

	const columns = useMemo(() => createBalanceColumns(t), [t]);

	return (
		<>
			<Heading title={t("balances")} badge={data.length} description="" />
			<Separator />
			<DataTable<BalanceColumn, unknown>
				data={data}
				columns={columns}
				searchKey="description"
			/>
		</>
	);
}
