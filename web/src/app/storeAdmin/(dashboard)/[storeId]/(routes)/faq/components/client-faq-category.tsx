"use client";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { ExportButton } from "@/components/export-button";
import { ImportButton } from "@/components/import-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heading } from "@/components/ui/heading";
import type { FaqCategory, FaqCategoryLocale } from "@/types";
import { useI18n } from "@/providers/i18n-provider";
import type { ColumnDef } from "@tanstack/react-table";
import axios, { type AxiosError } from "axios";
import { Copy, MoreHorizontal, Trash } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";

import logger from "@/lib/logger";
import { EditFaqCategory } from "./edit-faq-category";

interface Props {
	serverData: FaqCategory[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export const FaqCategoryClient: React.FC<Props> = ({ serverData }) => {
	const [data, setData] = useState<FaqCategory[]>(serverData);
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const params = useParams();
	const storeId = params.storeId as string;

	const [importLoading, setImportLoading] = useState(false);

	const { data: localesData } = useSWR<{
		locales: { id: string; lng: string; name: string }[];
	}>(
		`${process.env.NEXT_PUBLIC_API_URL}/common/get-locales?storeId=${storeId}`,
		fetcher,
	);
	const allLocales = localesData?.locales ?? [];

	const handleImport = async (importedData: any) => {
		if (!importedData || !Array.isArray(importedData)) return;
		setImportLoading(true);
		try {
			await axios.post(
				`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${storeId}/faqCategory/import`,
				{ categories: importedData },
			);
			toastSuccess({ description: "Import complete. Refreshing…" });
			window.location.reload();
		} catch (error: unknown) {
			toastError({
				title: t("something_went_wrong"),
				description: (error as AxiosError).message,
			});
		} finally {
			setImportLoading(false);
		}
	};

	const newObj = {
		id: "new",
		storeId: params.storeId as string,
		sortOrder: data.length + 1,
		published: false,
		createdOn: BigInt(0),
		updatedOn: BigInt(0),
		locales: [],
		FAQ: [],
	} as unknown as FaqCategory;

	const handleCreated = (val: FaqCategory) => {
		setData((prev) => [...prev, val]);
		logger.info("faqCategory created");
	};

	const handleUpdated = (val: FaqCategory) => {
		setData((prev) => prev.map((c) => (c.id === val.id ? val : c)));
		logger.info("faqCategory updated");
	};

	const handleDeleted = (val: FaqCategory) => {
		setData((prev) => prev.filter((c) => c.id !== val.id));
		logger.info("faqCategory deleted");
	};

	const CellAction = ({ item }: { item: FaqCategory }) => {
		const [open, setOpen] = useState(false);
		const [loading, setLoading] = useState(false);

		const onConfirm = async () => {
			setLoading(true);
			try {
				await axios.delete(
					`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${item.storeId}/faqCategory/${item.id}`,
				);
				toastSuccess({ description: t("faq_category_deleted") });
				handleDeleted(item);
			} catch (error: unknown) {
				toastError({
					title: t("something_went_wrong"),
					description: (error as AxiosError).message,
				});
			} finally {
				setLoading(false);
				setOpen(false);
			}
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
						<DropdownMenuItem
							onClick={() => {
								navigator.clipboard.writeText(item.id);
								toastSuccess({ description: t("id_copied") });
							}}
						>
							<Copy className="mr-2 size-4" /> {t("copy_id")}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setOpen(true)}>
							<Trash className="mr-2 size-4" /> {t("deleted")}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</>
		);
	};

	const primaryName = (item: FaqCategory) =>
		item.locales.find((l: FaqCategoryLocale) => l.localeId === lng)?.name ??
		item.locales[0]?.name ??
		"—";

	const columns: ColumnDef<FaqCategory>[] = [
		{
			id: "name",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("faq_category_name")} />
			),
			cell: ({ row }) => (
				<EditFaqCategory
					item={row.original}
					allCategories={data}
					onUpdated={handleUpdated}
				/>
			),
			enableHiding: false,
		},
		{
			id: "locales",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={t("locale")} />
			),
			cell: ({ row }) => (
				<div className="flex flex-wrap gap-1">
					{row.original.locales.map((l: FaqCategoryLocale) => (
						<Badge key={l.id} variant="secondary">
							{(
								allLocales.find((loc) => loc.id === l.localeId)?.lng ??
								l.localeId
							).toUpperCase()}
						</Badge>
					))}
				</div>
			),
		},
		{
			accessorKey: "sortOrder",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("faq_category_sort_order")}
				/>
			),
		},
		{
			id: "faqCount",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("faq_category_num_of_faq")}
				/>
			),
			cell: ({ row }) => row.original.FAQ?.length ?? 0,
		},
		{
			id: "actions",
			cell: ({ row }) => <CellAction item={row.original} />,
		},
	];

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title={t("faq_category_mgmt")}
					badge={data.length}
					description={t("faq_category_mgmt_descr")}
				/>
				<div className="flex gap-2">
					{importLoading ? (
						<Button variant="outline" disabled>
							Importing…
						</Button>
					) : (
						<ImportButton onImport={handleImport} importType="json" />
					)}
					<ExportButton
						data={data}
						filename="faq-categories.json"
						exportType="json"
					/>
					<EditFaqCategory item={newObj} onUpdated={handleCreated} />
				</div>
			</div>
			<DataTable columns={columns} data={data} />
		</>
	);
};
