"use client";

import { IconPlus } from "@tabler/icons-react";
import { useMemo, useState, useCallback, useEffect } from "react";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";

import type { CategoryColumn } from "../category-column";
import { BulkAddCategoriesDialog } from "./bulk-add-categories-dialog";
import { createCategoryColumns } from "./columns";
import { EditCategoryDialog } from "./edit-category-dialog";

interface CategoryClientProps {
	serverData: CategoryColumn[];
}

export const CategoryClient: React.FC<CategoryClientProps> = ({
	serverData,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const sortCategories = useCallback((list: CategoryColumn[]) => {
		return [...list].sort((a, b) => {
			const sortA = a.sortOrder ?? 0;
			const sortB = b.sortOrder ?? 0;
			if (sortA !== sortB) {
				return sortA - sortB;
			}
			return a.name.localeCompare(b.name);
		});
	}, []);

	const [data, setData] = useState<CategoryColumn[]>(() =>
		sortCategories(serverData),
	);

	useEffect(() => {
		setData(sortCategories(serverData));
	}, [serverData, sortCategories]);

	const handleCreated = useCallback(
		(newCategory: CategoryColumn) => {
			if (!newCategory) return;

			setData((prev) => {
				const exists = prev.some((item) => item.id === newCategory.id);
				if (exists) return prev;
				return sortCategories([...prev, newCategory]);
			});
		},
		[sortCategories],
	);

	const handleBulkCreated = useCallback(
		(newCategories: CategoryColumn[]) => {
			if (!newCategories?.length) return;

			setData((prev) => {
				const existingIds = new Set(prev.map((item) => item.id));
				const filtered = newCategories.filter(
					(item) => !existingIds.has(item.id),
				);
				if (!filtered.length) {
					return prev;
				}
				return sortCategories([...prev, ...filtered]);
			});
		},
		[sortCategories],
	);

	const handleDeleted = useCallback((categoryId: string) => {
		setData((prev) => prev.filter((item) => item.id !== categoryId));
	}, []);

	const handleUpdated = useCallback(
		(updatedCategory: CategoryColumn) => {
			setData((prev) => {
				const next = prev.map((item) =>
					item.id === updatedCategory.id ? updatedCategory : item,
				);
				return sortCategories(next);
			});
		},
		[sortCategories],
	);

	const nextSortOrder = useMemo(() => {
		const maxSort = data.reduce(
			(max, item) => Math.max(max, item.sortOrder ?? 0),
			0,
		);
		return maxSort + 1;
	}, [data]);

	const columns = useMemo(
		() =>
			createCategoryColumns(t, {
				onDeleted: handleDeleted,
				onUpdated: handleUpdated,
			}),
		[t, handleDeleted, handleUpdated],
	);

	return (
		<>
			<div className="flex items-center justify-between">
				<Heading
					title={t("Category_mgmt")}
					badge={data.length}
					description={t("Category_mgmt_descr")}
				/>
				<div className="flex gap-2">
					<EditCategoryDialog
						isNew
						defaultSortOrder={nextSortOrder}
						onCreated={handleCreated}
						trigger={
							<Button variant="outline">
								<IconPlus className="mr-0 size-4" />
								{t("create")}
							</Button>
						}
					/>
					<BulkAddCategoriesDialog onCreatedMany={handleBulkCreated} />
				</div>
			</div>

			<Separator />
			<DataTable<CategoryColumn, unknown>
				searchKey="name"
				columns={columns}
				data={data}
			/>
		</>
	);
};
