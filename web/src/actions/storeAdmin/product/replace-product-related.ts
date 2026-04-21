import type { PrismaClient } from "@prisma/client";

type DbClient = Pick<PrismaClient, "product" | "productRelatedProduct">;

/**
 * Parses newline- or comma-separated product IDs and replaces manual related rows.
 */
export async function replaceProductRelatedForSource(
	tx: DbClient,
	params: {
		storeId: string;
		sourceProductId: string;
		rawIdsText: string;
	},
): Promise<void> {
	const tokens = params.rawIdsText
		.split(/[\n,]+/)
		.map((s) => s.trim())
		.filter(Boolean);

	const unique = [...new Set(tokens)].filter(
		(id) => id !== params.sourceProductId,
	);

	if (unique.length === 0) {
		await tx.productRelatedProduct.deleteMany({
			where: { sourceProductId: params.sourceProductId },
		});
		return;
	}

	const found = await tx.product.findMany({
		where: {
			storeId: params.storeId,
			id: { in: unique },
		},
		select: { id: true },
	});
	const validIds = new Set(found.map((p) => p.id));
	const ordered = unique.filter((id) => validIds.has(id));

	await tx.productRelatedProduct.deleteMany({
		where: { sourceProductId: params.sourceProductId },
	});

	if (ordered.length === 0) {
		return;
	}

	await tx.productRelatedProduct.createMany({
		data: ordered.map((targetProductId, sortOrder) => ({
			sourceProductId: params.sourceProductId,
			targetProductId,
			sortOrder,
		})),
	});
}
