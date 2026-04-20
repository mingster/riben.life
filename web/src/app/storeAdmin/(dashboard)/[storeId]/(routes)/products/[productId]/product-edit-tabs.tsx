"use client";

import { IconTrash } from "@tabler/icons-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { deleteProductAction } from "@/actions/storeAdmin/product/delete-product";
import { useTranslation } from "@/app/i18n/client";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/providers/i18n-provider";
import type { ProductOptionTemplateColumn } from "../../product-option-template/product-option-template-column";
import { EditProduct } from "../components/edit-product";
import { ProductImageGallery } from "../components/product-image-gallery";
import type { ProductColumn } from "../product-column";
import { ProductEditCategoryTab } from "./product-edit-category-tab";
import { ProductEditOptionsTab } from "./product-edit-options-tab";
import type {
	AdminCategoryRow,
	ProductCategoryAssignmentRow,
} from "./product-edit-types";

export type {
	AdminCategoryRow,
	ProductCategoryAssignmentRow,
} from "./product-edit-types";

interface ProductEditTabsProps {
	storeId: string;
	product: ProductColumn;
	categories: AdminCategoryRow[];
	productCategoryAssignments: ProductCategoryAssignmentRow[];
	optionTemplates: ProductOptionTemplateColumn[];
	onProductUpdated: (product: ProductColumn) => void;
	onBack: () => void;
}

export function ProductEditTabs({
	storeId,
	product,
	categories,
	productCategoryAssignments,
	optionTemplates,
	onProductUpdated,
	onBack,
}: ProductEditTabsProps) {
	const params = useParams<{ storeId: string }>();
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);

	const linkHome = `/storeAdmin/${params.storeId}/`;
	const linkProducts = `/storeAdmin/${params.storeId}/products`;

	const handleDelete = async () => {
		setDeleteLoading(true);
		try {
			const result = await deleteProductAction(String(params.storeId), {
				productId: product.id,
			});
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			toastSuccess({ description: t("product_deleted") });
			router.push(linkProducts);
		} catch (err: unknown) {
			toastError({
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setDeleteLoading(false);
			setDeleteOpen(false);
		}
	};

	return (
		<>
			<AlertModal
				isOpen={deleteOpen}
				onClose={() => setDeleteOpen(false)}
				onConfirm={() => void handleDelete()}
				loading={deleteLoading}
			/>

			<div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Breadcrumb className="min-w-0 overflow-x-auto [-webkit-overflow-scrolling:touch]">
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink href={linkHome}>
								{t("store_dashboard")}
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbLink href={linkProducts}>
								{t("product_mgmt")}
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>{product.name}</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
				<Button
					type="button"
					variant="destructive"
					size="sm"
					className="touch-manipulation"
					onClick={() => setDeleteOpen(true)}
				>
					<IconTrash className="mr-2 size-4" />
					{t("delete")}
				</Button>
			</div>

			<Tabs defaultValue="basic" className="w-full min-w-0">
				<div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
					<div className="min-w-0 flex-1 -mx-1 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] sm:mx-0 sm:overflow-visible sm:pb-0">
						<TabsList className="inline-flex h-auto w-max min-w-full flex-nowrap justify-start gap-1 p-1 sm:w-fit sm:flex-wrap sm:gap-1">
							<TabsTrigger
								className="shrink-0 px-3 text-sm touch-manipulation sm:px-5 sm:text-sm"
								value="basic"
							>
								{t("product_tab_basic")}
							</TabsTrigger>
							<TabsTrigger
								className="shrink-0 px-3 text-sm touch-manipulation sm:px-5 sm:text-sm"
								value="images"
							>
								{t("product_tab_images")}
							</TabsTrigger>

							<TabsTrigger
								className="shrink-0 px-3 text-sm touch-manipulation sm:px-5 sm:text-sm"
								value="related"
							>
								{t("product_tab_related")}
							</TabsTrigger>
							<TabsTrigger
								className="shrink-0 px-3 text-sm touch-manipulation sm:px-5 sm:text-sm"
								value="category"
							>
								{t("product_tab_category")}
							</TabsTrigger>
							<TabsTrigger
								className="shrink-0 px-3 text-sm touch-manipulation sm:px-5 sm:text-sm"
								value="options"
							>
								{t("product_tab_options")}
							</TabsTrigger>

							<TabsTrigger
								className="shrink-0 px-3 text-sm touch-manipulation sm:px-5 sm:text-sm"
								value="attribute"
							>
								{t("product_tab_attribute")}
							</TabsTrigger>
						</TabsList>
					</div>
					<Button
						type="button"
						variant="outline"
						className="h-10 w-full shrink-0 touch-manipulation sm:h-9 sm:w-auto sm:min-h-0"
						onClick={onBack}
					>
						{t("cancel")}
					</Button>
				</div>

				<TabsContent forceMount value="basic" className="mt-4">
					<EditProduct
						product={product}
						layout="inline"
						formSections="basic"
						inlineTitle={t("product_tab_basic")}
						inlineDescription={t("product_mgmt_edit_descr")}
						onUpdated={onProductUpdated}
					/>
				</TabsContent>

				<TabsContent forceMount value="images" className="mt-4">
					<ProductImageGallery
						storeId={storeId}
						productId={product.id}
						initialImages={product.images}
					/>
				</TabsContent>

				<TabsContent forceMount value="related" className="mt-4">
					<EditProduct
						product={product}
						layout="inline"
						formSections="related"
						inlineTitle={t("product_tab_related")}
						inlineDescription={t("product_mgmt_edit_descr")}
						onUpdated={onProductUpdated}
					/>
				</TabsContent>

				<TabsContent forceMount value="category" className="mt-4">
					<ProductEditCategoryTab
						storeId={storeId}
						productId={product.id}
						categories={categories}
						initialAssignments={productCategoryAssignments}
					/>
				</TabsContent>

				<TabsContent forceMount value="options" className="mt-4">
					<ProductEditOptionsTab
						storeId={storeId}
						product={product}
						optionTemplates={optionTemplates}
						onProductUpdated={onProductUpdated}
					/>
				</TabsContent>

				<TabsContent forceMount value="attribute" className="mt-4">
					<EditProduct
						product={product}
						layout="inline"
						formSections="attribute"
						inlineTitle={t("product_tab_attribute")}
						inlineDescription={t("product_mgmt_edit_descr")}
						onUpdated={onProductUpdated}
					/>
				</TabsContent>
			</Tabs>
		</>
	);
}
