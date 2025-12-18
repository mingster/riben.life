"use client";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { IconPlus } from "@tabler/icons-react";
import { useMemo, useState, useCallback } from "react";
import type { LocaleColumn } from "../locale-column";
import { createLocaleColumns } from "./columns";
import { EditLocaleDialog } from "./edit-locale-dialog";

interface LocaleClientProps {
	serverData: LocaleColumn[];
}

export function LocaleClient({ serverData }: LocaleClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "sysAdmin");

	const [data, setData] = useState<LocaleColumn[]>(serverData);

	const handleCreated = useCallback((locale: LocaleColumn) => {
		setData((prev) =>
			[...prev, locale].sort((a, b) => a.name.localeCompare(b.name)),
		);
	}, []);

	const handleUpdated = useCallback((locale: LocaleColumn) => {
		setData((prev) => {
			const next = prev.map((item) => (item.id === locale.id ? locale : item));
			return next.sort((a, b) => a.name.localeCompare(b.name));
		});
	}, []);

	const handleDeleted = useCallback((localeId: string) => {
		setData((prev) => prev.filter((item) => item.id !== localeId));
	}, []);

	const columns = useMemo(
		() =>
			createLocaleColumns(t, {
				onUpdated: handleUpdated,
				onDeleted: handleDeleted,
			}),
		[t, handleDeleted, handleUpdated],
	);

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title="Locales"
					badge={data.length}
					description="Manage locales in this system."
				/>
				<EditLocaleDialog
					isNew
					onCreated={handleCreated}
					trigger={
						<Button variant="outline" className="h-10 sm:h-9">
							<IconPlus className="mr-2 size-4" />
							<span className="text-sm sm:text-xs">{t("create")}</span>
						</Button>
					}
				/>
			</div>
			<Separator />
			<DataTable<LocaleColumn, unknown>
				data={data}
				columns={columns}
				searchKey="name"
			/>
		</>
	);
}
