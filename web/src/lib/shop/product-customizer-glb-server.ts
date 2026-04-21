import fs from "node:fs";
import path from "node:path";

/**
 * True if `public/models/{glbKey}.glb` exists (server-only).
 * Kept separate from {@link ./product-customizer-glb} so client bundles never import `node:fs`.
 */
export function productHasCustomizerGlb(glbKey: string): boolean {
	try {
		const absolute = path.join(
			process.cwd(),
			"public",
			"models",
			`${glbKey}.glb`,
		);
		return fs.existsSync(absolute);
	} catch {
		return false;
	}
}
