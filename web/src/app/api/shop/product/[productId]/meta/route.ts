import { NextResponse } from "next/server";
import { getProductForStore } from "@/lib/shop/catalog";
import {
	buildDefaultOptionSelections,
	computeUnitPriceBreakdown,
} from "@/lib/shop/option-selections";
import { getShopStoreIdForApi } from "@/lib/shop-store-context";

export async function GET(
	req: Request,
	context: { params: Promise<{ productId: string }> },
) {
	const { productId } = await context.params;
	const url = new URL(req.url);
	const storeId = await getShopStoreIdForApi(url.searchParams.get("storeId"));
	if (!storeId) {
		return NextResponse.json(
			{ error: "No default storefront configured." },
			{ status: 503 },
		);
	}

	const product = await getProductForStore(storeId, productId);
	if (!product) {
		return NextResponse.json({ error: "Product not found" }, { status: 404 });
	}

	const merged = buildDefaultOptionSelections(product);
	const bd = computeUnitPriceBreakdown(product, merged);
	if (bd.error) {
		return NextResponse.json({ error: bd.error }, { status: 400 });
	}

	return NextResponse.json({
		productId: product.id,
		productName: product.name,
		currency: product.currency,
		productBase: bd.productBase,
		optionExtra: bd.optionExtra,
		unitWithDefaults: bd.unit,
	});
}
