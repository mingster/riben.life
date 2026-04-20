/** Store category row for product ↔ category assignment UI (JSON-serializable). */
export interface AdminCategoryRow {
	id: string;
	name: string;
	sortOrder: number;
	isFeatured: boolean;
}

export interface ProductCategoryAssignmentRow {
	categoryId: string;
	sortOrder: number;
}
