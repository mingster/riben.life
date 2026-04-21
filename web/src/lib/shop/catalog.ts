import type { Prisma } from "@prisma/client";

import { sqlClient } from "@/lib/prismadb";

const orderedImages = {
	orderBy: { sortOrder: "asc" as const },
} satisfies Prisma.ProductImagesFindManyArgs;

const productListInclude = {
	ProductImages: orderedImages,
	ProductCategories: {
		include: { Category: true },
	},
	ProductOptions: { include: { ProductOptionSelections: true } },
} as const;

export type ShopProductCard = Prisma.ProductGetPayload<{
	include: typeof productListInclude;
}>;

export async function listCategoriesForStore(storeId: string) {
	return sqlClient.category.findMany({
		where: { storeId },
		orderBy: { sortOrder: "asc" },
	});
}

export type ShopPlpSort = "new" | "name_asc" | "price_asc" | "price_desc";

const SHOP_PLP_SORTS: ShopPlpSort[] = [
	"new",
	"name_asc",
	"price_asc",
	"price_desc",
];

export function parseShopPlpSort(value: string | undefined): ShopPlpSort {
	if (value && SHOP_PLP_SORTS.includes(value as ShopPlpSort)) {
		return value as ShopPlpSort;
	}
	return "new";
}

export async function listProductsInCategory(
	storeId: string,
	categoryId: string,
	opts?: { q?: string; sort?: ShopPlpSort },
) {
	const q = opts?.q?.trim();
	const sort = opts?.sort ?? "new";

	const orderBy: Prisma.ProductOrderByWithRelationInput[] =
		sort === "name_asc"
			? [{ isFeatured: "desc" }, { name: "asc" }]
			: sort === "price_asc"
				? [{ isFeatured: "desc" }, { price: "asc" }]
				: sort === "price_desc"
					? [{ isFeatured: "desc" }, { price: "desc" }]
					: [{ isFeatured: "desc" }, { updatedAt: "desc" }];

	return sqlClient.product.findMany({
		where: {
			storeId,
			status: 1,
			ProductCategories: { some: { categoryId } },
			...(q
				? {
						name: { contains: q, mode: "insensitive" as const },
					}
				: {}),
		},
		orderBy,
		include: productListInclude,
	});
}

export async function getProductForStore(storeId: string, productRef: string) {
	return sqlClient.product.findFirst({
		where: {
			storeId,
			status: 1,
			OR: [{ id: productRef }, { slug: productRef }],
		},
		include: {
			ProductImages: orderedImages,
			ProductCategories: { include: { Category: true } },
			ProductOptions: { include: { ProductOptionSelections: true } },
			ProductAttribute: true,
		},
	});
}

export async function getCategoryForStore(storeId: string, categoryId: string) {
	return sqlClient.category.findFirst({
		where: { id: categoryId, storeId },
	});
}

/**
 * Other products sharing a category with this product (year-1 “related” strip).
 */
export async function listRelatedProductsForProduct(
	storeId: string,
	productId: string,
	categoryIds: string[],
	take = 4,
): Promise<ShopProductCard[]> {
	if (categoryIds.length === 0) return [];

	return sqlClient.product.findMany({
		where: {
			storeId,
			status: 1,
			id: { not: productId },
			ProductCategories: { some: { categoryId: { in: categoryIds } } },
		},
		take,
		orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
		include: productListInclude,
	});
}

/**
 * Manual `ProductRelatedProduct` rows first (by `sortOrder`), then category-based
 * suggestions to fill remaining slots.
 */
export async function listMergedRelatedProductsForProduct(
	storeId: string,
	productId: string,
	categoryIds: string[],
	take = 4,
): Promise<ShopProductCard[]> {
	const manual = await sqlClient.productRelatedProduct.findMany({
		where: { sourceProductId: productId },
		orderBy: { sortOrder: "asc" },
		select: { targetProductId: true },
	});
	const manualIds = manual.map((m) => m.targetProductId);

	const manualProducts =
		manualIds.length > 0
			? await sqlClient.product.findMany({
					where: {
						storeId,
						status: 1,
						id: { in: manualIds },
					},
					include: productListInclude,
				})
			: [];

	const byId = new Map(manualProducts.map((p) => [p.id, p]));
	const orderedManual = manualIds
		.map((id) => byId.get(id))
		.filter((p): p is ShopProductCard => Boolean(p));

	const exclude = new Set<string>([productId, ...manualIds]);
	const remaining = Math.max(0, take - orderedManual.length);

	let fromCategory: ShopProductCard[] = [];
	if (remaining > 0 && categoryIds.length > 0) {
		fromCategory = await sqlClient.product.findMany({
			where: {
				storeId,
				status: 1,
				id: { notIn: [...exclude] },
				ProductCategories: { some: { categoryId: { in: categoryIds } } },
			},
			take: remaining,
			orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
			include: productListInclude,
		});
	}

	return [...orderedManual, ...fromCategory];
}

/** Homepage / shop hero: featured first, then recent. */
export async function listFeaturedProductsForStore(
	storeId: string,
	take = 6,
): Promise<ShopProductCard[]> {
	return sqlClient.product.findMany({
		where: { storeId, status: 1 },
		take,
		orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
		include: productListInclude,
	});
}
