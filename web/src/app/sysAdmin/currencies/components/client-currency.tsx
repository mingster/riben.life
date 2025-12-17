"use client";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { IconPlus } from "@tabler/icons-react";
import { useMemo, useState, useCallback } from "react";
import type { CurrencyColumn } from "../currency-column";
import { createCurrencyColumns } from "./columns";
import { EditCurrencyDialog } from "./edit-currency-dialog";

interface CurrencyClientProps {
	serverData: CurrencyColumn[];
}

export function CurrencyClient({ serverData }: CurrencyClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "sysAdmin");

	const [data, setData] = useState<CurrencyColumn[]>(serverData);

	const handleCreated = useCallback((currency: CurrencyColumn) => {
		setData((prev) =>
			[...prev, currency].sort((a, b) => a.name.localeCompare(b.name)),
		);
	}, []);

	const handleUpdated = useCallback((currency: CurrencyColumn) => {
		setData((prev) => {
			const next = prev.map((item) =>
				item.id === currency.id ? currency : item,
			);
			return next.sort((a, b) => a.name.localeCompare(b.name));
		});
	}, []);

	const handleDeleted = useCallback((currencyId: string) => {
		setData((prev) => prev.filter((item) => item.id !== currencyId));
	}, []);

	const columns = useMemo(
		() =>
			createCurrencyColumns(t, {
				onUpdated: handleUpdated,
				onDeleted: handleDeleted,
			}),
		[t, handleDeleted, handleUpdated],
	);

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title="Currencies"
					badge={data.length}
					description="Manage currencies in this system."
				/>
				<EditCurrencyDialog
					isNew
					onCreated={handleCreated}
					trigger={
						<Button
							variant="outline"
							className="h-10 min-h-[44px] sm:h-9 sm:min-h-0 touch-manipulation"
						>
							<IconPlus className="mr-2 size-4" />
							<span className="text-sm sm:text-xs">{t("create")}</span>
						</Button>
					}
				/>
			</div>
			<Separator />
			<DataTable<CurrencyColumn, unknown>
				data={data}
				columns={columns}
				searchKey="name"
			/>
		</>
	);
}
