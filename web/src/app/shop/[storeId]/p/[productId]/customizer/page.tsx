import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { parseBagCustomizationPayload } from "@/actions/product/customize-product.validation";
import { ProductCustomizeClient } from "@/components/shop/product-customize-client";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { getProductForStore } from "@/lib/shop/catalog";
import {
	buildDefaultOptionSelections,
	computeUnitPriceBreakdown,
} from "@/lib/shop/option-selections";
import {
	getCustomizerGlbUrl,
	resolveGlbKey,
} from "@/lib/shop/product-customizer-glb";
import { productHasCustomizerGlb } from "@/lib/shop/product-customizer-glb-server";
import { buildInitialCustomizationFromProduct } from "@/lib/shop/product-customizer-initial";

interface PageProps {
	params: Promise<{ storeId: string; productId: string }>;
}

export default async function ShopProductCustomizerPage(props: PageProps) {
	const { storeId, productId } = await props.params;

	const product = await getProductForStore(storeId, productId);
	if (!product) {
		notFound();
	}

	const glbKey = resolveGlbKey(product.slug, product.id);
	if (!productHasCustomizerGlb(glbKey)) {
		notFound();
	}

	const merged = buildDefaultOptionSelections(product);
	const bd = computeUnitPriceBreakdown(product, merged);
	if (bd.error) {
		notFound();
	}

	const glbUrl = getCustomizerGlbUrl(glbKey);
	let initialCustomization = buildInitialCustomizationFromProduct(
		product.ProductAttribute,
	);

	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (session?.user?.id) {
		const saved = await sqlClient.savedProductCustomization.findUnique({
			where: {
				userId_productId: {
					userId: session.user.id,
					productId: product.id,
				},
			},
		});
		if (saved) {
			const parsed = parseBagCustomizationPayload(saved.customization);
			if (parsed.success) {
				initialCustomization = parsed.data;
			}
		}
	}

	return (
		<ProductCustomizeClient
			storeId={storeId}
			productId={product.id}
			productName={product.name}
			currency={product.currency}
			productBase={bd.productBase}
			optionExtra={bd.optionExtra}
			unitWithDefaults={bd.unit}
			glbUrl={glbUrl}
			initialCustomization={initialCustomization}
		/>
	);
}
