import type { Category, ProductCategories } from "@prisma/client";

export interface CategoryWithRelations extends Category {
	ProductCategories?: ProductCategories[];
}

export interface CategoryColumn {
	id: string;
	storeId: string;
	name: string;
	isFeatured: boolean;
	sortOrder: number;
	numOfProducts: number;
}

export const mapCategoryToColumn = (
	category: CategoryWithRelations,
): CategoryColumn => ({
	id: category.id,
	storeId: category.storeId,
	name: category.name,
	isFeatured: category.isFeatured,
	sortOrder: category.sortOrder,
	numOfProducts: category.ProductCategories?.length ?? 0,
});
