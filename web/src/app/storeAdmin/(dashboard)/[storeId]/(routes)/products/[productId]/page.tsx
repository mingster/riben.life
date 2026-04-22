import { notFound, redirect } from "next/navigation";

import { sqlClient } from "@/lib/prismadb";
import {
	mapProductToColumn,
	type ProductWithRelations,
} from "@/lib/store-admin/map-product-column";
import { transformPrismaDataForJson } from "@/utils/utils";
import {
	mapProductOptionTemplateToColumn,
	type ProductOptionTemplateColumn,
} from "../../product-option-template/product-option-template-column";

import { ProductEditPageClient } from "./product-edit-page-client";

type Params = Promise<{ storeId: string; productId: string }>;

export default async function StoreProductDetailPage(props: {
	params: Params;
}) {
	const raw = await props.params;
	const storeId = raw.storeId?.trim();
	const productId = raw.productId?.trim();
	if (!storeId || !productId) {
		notFound();
	}

	const row = await sqlClient.product.findFirst({
		where: {
			id: productId,
			storeId,
		},
		include: {
			ProductAttribute: true,
			ProductOptions: {
				include: { ProductOptionSelections: { orderBy: { name: "asc" } } },
				orderBy: { sortOrder: "asc" },
			},
			ProductImages: {
				orderBy: { sortOrder: "asc" },
			},
			relatedOutgoing: {
				orderBy: { sortOrder: "asc" },
				select: { targetProductId: true },
			},
			ProductCategories: {
				orderBy: { sortOrder: "asc" },
			},
		},
	});

	if (!row) {
		const elsewhere = await sqlClient.product.findFirst({
			where: { id: productId },
			select: { storeId: true },
		});
		if (elsewhere && elsewhere.storeId !== storeId) {
			redirect(`/storeAdmin/${elsewhere.storeId}/products/${productId}`);
		}
		notFound();
	}

	const categories = await sqlClient.category.findMany({
		where: { storeId },
		orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
	});

	transformPrismaDataForJson(row);
	transformPrismaDataForJson(categories);

	const relatedProductIdsText = row.relatedOutgoing
		.map((r) => r.targetProductId)
		.join("\n");

	const product = mapProductToColumn(row as ProductWithRelations, {
		relatedProductIdsText,
	});

	const productCategoryAssignments = row.ProductCategories.map((pc) => ({
		categoryId: pc.categoryId,
		sortOrder: pc.sortOrder,
	}));

	const adminCategoryRows = categories.map((c) => ({
		id: c.id,
		name: c.name,
		sortOrder: c.sortOrder,
		isFeatured: c.isFeatured,
	}));

	const storeOptionTemplates =
		await sqlClient.storeProductOptionTemplate.findMany({
			where: { storeId },
			include: { StoreProductOptionSelectionsTemplate: true },
			orderBy: { sortOrder: "asc" },
		});

	transformPrismaDataForJson(storeOptionTemplates);

	const optionTemplates: ProductOptionTemplateColumn[] =
		storeOptionTemplates.map(mapProductOptionTemplateToColumn);

	return (
		<ProductEditPageClient
			product={product}
			storeId={storeId}
			categories={adminCategoryRows}
			productCategoryAssignments={productCategoryAssignments}
			optionTemplates={optionTemplates}
		/>
	);
}
