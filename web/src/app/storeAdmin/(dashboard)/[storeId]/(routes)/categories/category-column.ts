import type {
	Category,
	CategoryLocale,
	ProductCategories,
} from "@prisma/client";

export interface CategoryWithRelations extends Category {
	ProductCategories?: ProductCategories[];
	locales?: CategoryLocale[];
}

export interface CategoryColumn {
	id: string;
	storeId: string;
	name: string;
	isFeatured: boolean;
	sortOrder: number;
	numOfProducts: number;
	locales: CategoryLocale[];
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
	locales: category.locales ?? [],
});
