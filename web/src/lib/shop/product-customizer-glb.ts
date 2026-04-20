/**
 * Filename stem for `public/models/{glbKey}.glb` (served as `/models/{glbKey}.glb`).
 * Prefer URL slug when set; otherwise use product id so the file can still be named deterministically.
 */
export function resolveGlbKey(
	slug: string | null | undefined,
	productId: string,
): string {
	const trimmed = slug?.trim();
	if (trimmed) {
		return trimmed;
	}
	return productId;
}

/** Public URL path for Next static file serving. */
export function getCustomizerGlbUrl(glbKey: string): string {
	return `/models/${glbKey}.glb`;
}

/**
 * Fallback GLB for legacy routes (e.g. `/shop/p/ac73b282-837f-4451-933e-0b59961d6b76/customizer` without a product context).
 * Must match a file under `public/models/` when that flow is used.
 */
export const DEFAULT_CUSTOMIZER_GLB_PATH = "/models/bag-textured.glb";
