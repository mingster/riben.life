"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import Container from "@/components/ui/container";
import type { ProductOptionTemplateColumn } from "../../product-option-template/product-option-template-column";
import type { ProductColumn } from "../product-column";
import { ProductEditTabs } from "./product-edit-tabs";
import type {
	AdminCategoryRow,
	ProductCategoryAssignmentRow,
} from "./product-edit-types";

export function ProductEditPageClient({
	product,
	storeId,
	categories,
	productCategoryAssignments,
	optionTemplates,
}: {
	product: ProductColumn;
	storeId: string;
	categories: AdminCategoryRow[];
	productCategoryAssignments: ProductCategoryAssignmentRow[];
	optionTemplates: ProductOptionTemplateColumn[];
}) {
	const router = useRouter();
	const [productState, setProductState] = useState(product);

	const handleProductUpdated = useCallback((next: ProductColumn) => {
		setProductState((prev) => ({
			...next,
			images: next.images?.length > 0 ? next.images : prev.images,
			productOptions: next.productOptions ?? prev.productOptions,
		}));
	}, []);

	return (
		<Container className="w-full py-4">
			<ProductEditTabs
				storeId={storeId}
				product={productState}
				categories={categories}
				productCategoryAssignments={productCategoryAssignments}
				optionTemplates={optionTemplates}
				onProductUpdated={handleProductUpdated}
				onBack={() => router.push(`/storeAdmin/${storeId}/products`)}
			/>
		</Container>
	);
}
