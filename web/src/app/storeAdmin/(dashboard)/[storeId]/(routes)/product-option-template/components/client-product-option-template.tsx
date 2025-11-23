"use client";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { IconPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createProductOptionTemplateColumns } from "./columns";
import { EditProductOptionTemplateDialog } from "./edit-product-option-template-dialog";
import type { ProductOptionTemplateColumn } from "../product-option-template-column";

interface ProductOptionTemplateClientProps {
	serverData: ProductOptionTemplateColumn[];
}

const sortTemplates = (templates: ProductOptionTemplateColumn[]) => {
	return [...templates].sort((a, b) => {
		const sortDiff = a.sortOrder - b.sortOrder;
		if (sortDiff !== 0) {
			return sortDiff;
		}

		return a.optionName.localeCompare(b.optionName, undefined, {
			numeric: true,
			sensitivity: "base",
		});
	});
};

export function ProductOptionTemplateClient({
	serverData,
}: ProductOptionTemplateClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const [data, setData] = useState<ProductOptionTemplateColumn[]>(() =>
		sortTemplates(serverData),
	);

	useEffect(() => {
		setData(sortTemplates(serverData));
	}, [serverData]);

	const handleCreated = useCallback((template: ProductOptionTemplateColumn) => {
		setData((prev) => sortTemplates([...prev, template]));
	}, []);

	const handleUpdated = useCallback((template: ProductOptionTemplateColumn) => {
		setData((prev) => {
			const next = prev.map((item) =>
				item.id === template.id ? template : item,
			);

			return sortTemplates(next);
		});
	}, []);

	const handleDeleted = useCallback((templateId: string) => {
		setData((prev) => prev.filter((item) => item.id !== templateId));
	}, []);

	const columns = useMemo(
		() =>
			createProductOptionTemplateColumns(t, {
				onUpdated: handleUpdated,
				onDeleted: handleDeleted,
			}),
		[t, handleUpdated, handleDeleted],
	);

	return (
		<>
			<div className="flex items-center justify-between">
				<Heading
					title={t("ProductOption_template_mgmt")}
					badge={data.length}
					description=""
				/>
				<EditProductOptionTemplateDialog
					isNew
					onCreated={handleCreated}
					trigger={
						<Button variant="outline">
							<IconPlus className="mr-0 size-4" />
							{t("Create")}
						</Button>
					}
				/>
			</div>
			<Separator />
			<DataTable<ProductOptionTemplateColumn, unknown>
				data={data}
				columns={columns}
				searchKey="optionName"
			/>
		</>
	);
}
