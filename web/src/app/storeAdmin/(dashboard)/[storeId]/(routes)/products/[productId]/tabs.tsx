"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Product, StoreProductOptionTemplate } from "@/types";
import type {
	Category,
	ProductAttribute,
	ProductCategories,
	ProductImages,
	ProductOption,
} from "@prisma/client";
import { useParams, useSearchParams } from "next/navigation";
import { ProductEditAttributeTab } from "./product-edit-attribute-tab";
import { ProductEditBasicTab } from "./product-edit-basic-tab";
import { ProductEditCategoryTab } from "./product-edit-category-tab";
import { ProductEditImageTab } from "./product-edit-image-tab";

import { useTranslation } from "@/app/i18n/client";
import { toastError, toastSuccess } from "@/components/Toaster";
import { AlertModal } from "@/components/modals/alert-modal";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import axios from "axios";
import { Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { ProductEditOptionsTab } from "./product-edit-options-tab";

interface editProps {
	initialData:
	| (Product & {
		ProductImages: ProductImages[] | [];
		ProductAttribute: ProductAttribute | null;
		ProductCategories: ProductCategories[] | [];
		ProductOptions: ProductOption[] | [];
	})
	| null;
	allCategories: Category[];
	storeOptionTemplates: StoreProductOptionTemplate[] | [];
	action: string;
}

export const ProductEditTabs = ({
	initialData,
	allCategories,
	storeOptionTemplates,
	action,
}: editProps) => {
	//const router = useRouter();
	const params = useParams();

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	//console.log(`ProductEditTabs: ${JSON.stringify(initialData?.ProductCategories)}`);

	let pageTitle = t(action) + t("product");
	if (initialData) {
		pageTitle = `${pageTitle} - ${initialData?.name}`;
	}

	const searchParams = useSearchParams();
	const initialTab = searchParams.get("tab");
	const [activeTab, setActiveTab] = useState(initialTab || "basic"); //show order tab by default

	const handleTabChange = (value: string) => {
		//update the state
		setActiveTab(value);
		console.log(`handleTabChange: ${value}`);
		// update the URL query parameter
		//router.push({ query: { tab: value } });
	};

	// if the query parameter changes, update the state
	useEffect(() => {
		if (initialTab) setActiveTab(initialTab);
	}, [initialTab]);
	//console.log('selectedTab: ' + activeTab);

	const onConfirm = async () => {
		//try {
		setLoading(true);
		await axios.delete(
			`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/product/${initialData?.id}`,
		);

		toastSuccess({
			title: t("Product_deleted"),
			description: "",
		});

		window.location.assign(`/storeAdmin/${params.storeId}/products`);

		setLoading(false);
		setOpen(false);
		/*} catch (error: unknown) {
	  const err = error as AxiosError;
	  toastError({
		title: "something wrong.",
		description: err.message,
	    
	  });
	} finally {
	  setLoading(false);
	  setOpen(false);
	}*/
	};

	/*
  <ProductPreviewDialog initialData={initialData} />
*/

	const link_home = `/storeAdmin/${params.storeId}/`;
	const link_products = `/storeAdmin/${params.storeId}/products`;

	return (
		<>
			<AlertModal
				isOpen={open}
				onClose={() => setOpen(false)}
				onConfirm={onConfirm}
				loading={loading}
			/>

			<div className="flex items-center justify-between">
				<div className="grow">
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink href={link_home}>
									{t("StoreDashboard")}
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbLink href={link_products}>
									{t("Products")}
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>{pageTitle}</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</div>
				{initialData && (
					<Button
						title={t("Delete")}
						disabled={loading}
						variant="destructive"
						size="sm"
						onClick={() => setOpen(true)}
					>
						<Trash className="size-4" />
					</Button>
				)}
			</div>

			<Tabs
				value={activeTab}
				defaultValue="basic"
				onValueChange={handleTabChange}
			>
				<TabsList>
					<TabsTrigger
						className="data-[state=active]:text-amber-600 dark:data-[state=active]:text-green-600 px-5 lg:min-w-40"
						value="basic">
						{t("Product_tab_basic")}
					</TabsTrigger>
					{params.productId !== "new" && (
						<>
							<TabsTrigger
								className="data-[state=active]:text-amber-600 dark:data-[state=active]:text-green-600 px-5 lg:min-w-40"
								value="categories">
								{t("Product_tab_category")}
							</TabsTrigger>

							<TabsTrigger
								className="data-[state=active]:text-amber-600 dark:data-[state=active]:text-green-600 px-5 lg:min-w-40"
								value="options">
								{t("Product_tab_options")}
							</TabsTrigger>

							<TabsTrigger
								className="data-[state=active]:text-amber-600 dark:data-[state=active]:text-green-600 px-5 lg:min-w-40"
								value="attribute">
								{t("Product_tab_attribute")}
							</TabsTrigger>

							<TabsTrigger
								className="data-[state=active]:text-amber-600 dark:data-[state=active]:text-green-600 px-5 lg:min-w-40"
								value="images">
								{t("Product_tab_images")}
							</TabsTrigger>
						</>
					)}
				</TabsList>

				<TabsContent value="basic">
					<ProductEditBasicTab initialData={initialData} action={action} />
				</TabsContent>

				<TabsContent value="categories">
					<ProductEditCategoryTab
						initialData={initialData?.ProductCategories}
						allCategories={allCategories}
						action={action}
					/>
				</TabsContent>

				<TabsContent value="options">
					<ProductEditOptionsTab
						initialData={initialData}
						action={action}
						storeOptionTemplates={storeOptionTemplates}
					/>
				</TabsContent>

				<TabsContent value="attribute">
					<ProductEditAttributeTab
						initialData={initialData?.ProductAttribute}
						action={action}
					/>
				</TabsContent>

				<TabsContent value="images">
					<ProductEditImageTab
						initialData={initialData?.ProductImages}
						action={action}
					/>
				</TabsContent>
			</Tabs>
		</>
	);
};
