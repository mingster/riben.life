/**
 * Canonical PDP path: `/shop/[storeId]/p/...` using `slug` when set, otherwise stable `id`.
 */
export function shopProductPath(
	storeId: string,
	product: {
		id: string;
		slug: string | null;
	},
): string {
	const segment = product.slug?.trim() || product.id;
	return `/shop/${storeId}/p/${segment}`;
}
