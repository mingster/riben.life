/** Stable cart line id for customized products (same config merges quantity). */
export function customizedCartLineId(
	productId: string,
	customizationJson: string,
): string {
	let h = 2166136261;
	const s = `${productId}|${customizationJson}`;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return `c:${productId}:${(h >>> 0).toString(16)}`;
}
