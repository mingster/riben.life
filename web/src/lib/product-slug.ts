import { sqlClient } from "@/lib/prismadb";

/**
 * Normalizes a string into a URL-safe slug (lowercase, hyphens, a-z0-9).
 */
export function slugifyProductSlug(input: string): string {
	const base = input
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 120);
	return base.length > 0 ? base : "product";
}

/**
 * Resolves a unique `slug` for `(storeId, slug)`; returns `null` if the caller
 * explicitly wants no slug (empty after trim).
 */
export async function allocateUniqueProductSlug(
	storeId: string,
	desiredRaw: string | null | undefined,
	excludeProductId?: string,
): Promise<string | null> {
	const trimmed = desiredRaw?.trim() ?? "";
	if (trimmed === "") {
		return null;
	}

	const base = slugifyProductSlug(trimmed);
	for (let i = 0; i < 500; i++) {
		const candidate = i === 0 ? base : `${base}-${i + 1}`;
		const existing = await sqlClient.product.findFirst({
			where: {
				storeId,
				slug: candidate,
				...(excludeProductId ? { id: { not: excludeProductId } } : {}),
			},
			select: { id: true },
		});
		if (!existing) {
			return candidate;
		}
	}

	throw new Error("Could not allocate a unique product slug");
}

/**
 * When no slug is provided on create, derive one from the product name.
 */
export async function allocateSlugFromNameIfNeeded(
	storeId: string,
	explicitSlug: string | null | undefined,
	productName: string,
	excludeProductId?: string,
): Promise<string | null> {
	const trimmed = explicitSlug?.trim() ?? "";
	if (trimmed !== "") {
		return allocateUniqueProductSlug(storeId, trimmed, excludeProductId);
	}
	return allocateUniqueProductSlug(storeId, productName, excludeProductId);
}
