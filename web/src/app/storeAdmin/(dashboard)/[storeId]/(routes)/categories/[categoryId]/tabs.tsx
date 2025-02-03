"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Heading } from "@/components/ui/heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Category, Product, ProductCategories } from "@prisma/client";
import { useParams } from "next/navigation";

import { CategoryEditBasicTab } from "./category-edit-basic-tab";
import { CategoryEditProductTab } from "./category-edit-product-tab";

interface editProps {
	initialData:
		| (Category & {
				ProductCategories: ProductCategories[] | [];
		  })
		| null;
	allProducts: Product[];
	action: string;
}
export const CategoryEditTabs = ({
	initialData,
	allProducts,
	action,
}: editProps) => {
	const params = useParams();

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	//console.log(`ProductEditTabs: ${JSON.stringify(initialData?.ProductCategories)}`);

	const pageTitle = t(action) + t("Category");

	return (
		<>
			<Heading title={pageTitle} description="" />
			<Tabs defaultValue="basic" className="w-full">
				<TabsList>
					<TabsTrigger className="px-5 lg:min-w-40" value="basic">
						{t("Category_Mgmt_tab_basic")}
					</TabsTrigger>
					{params.productId !== "new" && (
						<TabsTrigger className="px-5 lg:min-w-40" value="products">
							{t("Category_Mgmt_tab_products")}
						</TabsTrigger>
					)}
				</TabsList>
				<TabsContent value="basic">
					<CategoryEditBasicTab initialData={initialData} />
				</TabsContent>
				<TabsContent value="products">
					<CategoryEditProductTab
						storeId={initialData?.storeId || ""}
						initialData={initialData?.ProductCategories}
						allProducts={allProducts}
					/>
				</TabsContent>
			</Tabs>
		</>
	);
};
