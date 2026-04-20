"use client";

import { IconEdit, IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	mapPrismaProductOptionToRow,
	type ProductOptionRow,
} from "@/lib/store-admin/map-product-column";
import { useI18n } from "@/providers/i18n-provider";
import type { ProductOptionTemplateColumn } from "../../product-option-template/product-option-template-column";
import type { ProductColumn } from "../product-column";
import {
	AddProductOptionTrigger,
	EditProductOptionDialog,
} from "./edit-product-option-dialog";

interface ProductEditOptionsTabProps {
	storeId: string;
	product: ProductColumn;
	optionTemplates: ProductOptionTemplateColumn[];
	onProductUpdated: (product: ProductColumn) => void;
}

export function ProductEditOptionsTab({
	storeId,
	product,
	optionTemplates,
	onProductUpdated,
}: ProductEditOptionsTabProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const optionsSnapshot = useMemo(
		() => JSON.stringify(product.productOptions ?? []),
		[product.productOptions],
	);

	const [options, setOptions] = useState<ProductOptionRow[]>(
		product.productOptions ?? [],
	);
	const [deleteTarget, setDeleteTarget] = useState<ProductOptionRow | null>(
		null,
	);
	const [deleteLoading, setDeleteLoading] = useState(false);
	const [templateId, setTemplateId] = useState<string>("--");
	const [copyLoading, setCopyLoading] = useState(false);

	useEffect(() => {
		setOptions(JSON.parse(optionsSnapshot) as ProductOptionRow[]);
	}, [optionsSnapshot]);

	const pushParent = useCallback(
		(next: ProductOptionRow[]) => {
			const sorted = [...next].sort((a, b) => a.sortOrder - b.sortOrder);
			setOptions(sorted);
			onProductUpdated({
				...product,
				productOptions: sorted,
				hasOptions: sorted.length > 0,
			});
		},
		[onProductUpdated, product],
	);

	const handleSaved = useCallback(
		(row: ProductOptionRow) => {
			const exists = options.some((o) => o.id === row.id);
			const next = exists
				? options.map((o) => (o.id === row.id ? row : o))
				: [...options, row];
			pushParent(next);
		},
		[options, pushParent],
	);

	const handleDeleteConfirm = useCallback(async () => {
		if (!deleteTarget) {
			return;
		}
		setDeleteLoading(true);
		try {
			const res = await fetch(
				`/api/storeAdmin/${storeId}/product/${product.id}/options/${deleteTarget.id}`,
				{ method: "DELETE" },
			);
			if (!res.ok) {
				const text = await res.text();
				toastError({
					description: text || res.statusText,
				});
				return;
			}
			const next = options.filter((o) => o.id !== deleteTarget.id);
			pushParent(next);
			toastSuccess({ description: t("deleted") });
		} catch (err: unknown) {
			toastError({
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setDeleteLoading(false);
			setDeleteTarget(null);
		}
	}, [deleteTarget, options, product.id, pushParent, storeId, t]);

	const handleCopyTemplate = useCallback(async () => {
		if (templateId === "--") {
			return;
		}
		setCopyLoading(true);
		try {
			const res = await fetch(
				`/api/storeAdmin/${storeId}/product/${product.id}/options/copy-option-template/${templateId}`,
				{ method: "POST" },
			);
			if (!res.ok) {
				const text = await res.text();
				toastError({
					description: text || res.statusText,
				});
				return;
			}
			const raw = (await res.json()) as Record<string, unknown>;
			const row = mapPrismaProductOptionToRow(
				raw as unknown as Parameters<typeof mapPrismaProductOptionToRow>[0],
			);
			const exists = options.some((o) => o.id === row.id);
			const next = exists
				? options.map((o) => (o.id === row.id ? row : o))
				: [...options, row];
			pushParent(next);
			toastSuccess({ description: t("product_option_copy_to_product") });
			setTemplateId("--");
		} catch (err: unknown) {
			toastError({
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setCopyLoading(false);
		}
	}, [options, product.id, pushParent, storeId, t, templateId]);

	const templateMgmtHref = `/storeAdmin/${storeId}/product-option-template`;

	return (
		<>
			<Card className="w-full min-w-0">
				<CardContent className="space-y-0 pt-0">
					<div className="flex flex-row justify-between">
						<p className="text-sm text-muted-foreground">
							{t("product_mgmt_options_descr")}
						</p>

						<AddProductOptionTrigger
							storeId={storeId}
							productId={product.id}
							onSaved={handleSaved}
						/>
					</div>

					<div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
						<div className="flex min-w-0 w-full flex-1 flex-col gap-2">
							<span className="text-sm font-medium">
								{t("product_option_template")}
							</span>
							<div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
								<Select value={templateId} onValueChange={setTemplateId}>
									<SelectTrigger className="w-full touch-manipulation sm:min-w-0 sm:flex-1">
										<SelectValue placeholder={t("select_template_optional")} />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="--">
											{t("select_template_optional")}
										</SelectItem>
										{optionTemplates.map((tpl) => (
											<SelectItem key={tpl.id} value={tpl.id}>
												{tpl.optionName}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button
									type="button"
									variant="secondary"
									disabled={templateId === "--" || copyLoading}
									className="w-full touch-manipulation sm:w-auto sm:shrink-0"
									onClick={() => void handleCopyTemplate()}
								>
									{t("product_option_copy_to_product")}
								</Button>
							</div>
						</div>
					</div>

					{options.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							{t("product_options_no_options_yet")}

							<Link
								href={templateMgmtHref}
								className="text-sm text-primary underline-offset-4 hover:underline"
							>
								{t("product_option_template_mgmt")}
							</Link>
						</p>
					) : (
						<div className="w-full min-w-0 rounded-md border overflow-x-auto">
							<Table className="w-full">
								<TableHeader>
									<TableRow>
										<TableHead>{t("product_option_option_name")}</TableHead>
										<TableHead className="w-24 text-right">
											{t("product_options_selection_count")}
										</TableHead>
										<TableHead className="w-28 text-right">
											{t("category_sort_order")}
										</TableHead>
										<TableHead className="w-32 text-right">
											{t("product_options_table_actions")}
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{options.map((row) => (
										<TableRow key={row.id}>
											<TableCell className="font-medium">
												{row.optionName}
											</TableCell>
											<TableCell className="text-right">
												{row.selections.length}
											</TableCell>
											<TableCell className="text-right">
												{row.sortOrder}
											</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end gap-1">
													<EditProductOptionDialog
														storeId={storeId}
														productId={product.id}
														option={row}
														onSaved={handleSaved}
														trigger={
															<Button
																type="button"
																size="icon"
																variant="ghost"
																className="size-9 touch-manipulation sm:size-8"
																aria-label={t("edit")}
															>
																<IconEdit className="size-4" />
															</Button>
														}
													/>
													<Button
														type="button"
														size="icon"
														variant="ghost"
														className="size-9 touch-manipulation sm:size-8"
														aria-label={t("delete")}
														onClick={() => setDeleteTarget(row)}
													>
														<IconTrash className="size-4 text-destructive" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			<AlertModal
				isOpen={Boolean(deleteTarget)}
				onClose={() => setDeleteTarget(null)}
				onConfirm={() => void handleDeleteConfirm()}
				loading={deleteLoading}
			/>
		</>
	);
}
