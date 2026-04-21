import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/app/i18n";
import { ProductDescriptionContent } from "@/components/shop/product-description-content";
import { ShopProductBuyPanel } from "@/components/shop/shop-product-buy-panel";
import type { ShopGalleryImage } from "@/components/shop/shop-product-gallery";
import { ShopProductGallery } from "@/components/shop/shop-product-gallery";
import { ShopProductSpecs } from "@/components/shop/shop-product-specs";
import { ShopRelatedProducts } from "@/components/shop/shop-related-products";
import {
	getProductForStore,
	listMergedRelatedProductsForProduct,
} from "@/lib/shop/catalog";
import { resolveGlbKey } from "@/lib/shop/product-customizer-glb";
import { productHasCustomizerGlb } from "@/lib/shop/product-customizer-glb-server";

interface PageProps {
	params: Promise<{ storeId: string; productId: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
	const { t } = await getT(undefined, "shop");
	const { storeId, productId } = await props.params;

	const product = await getProductForStore(storeId, productId);
	if (!product) return { title: t("shop_product_meta_title_fallback") };

	const titleBase = product.seoTitle?.trim() || product.name;
	const descSource =
		product.seoDescription?.trim() ||
		product.description
			?.replace(/<[^>]+>/g, " ")
			.trim()
			.slice(0, 160) ||
		t("shop_product_meta_description_template", { name: product.name });

	const ogImage = product.ProductImages[0]?.url;

	return {
		title: `${titleBase} ${t("shop_product_meta_title_suffix")}`,
		description: descSource,
		openGraph: {
			title: titleBase,
			description: descSource,
			images: ogImage ? [{ url: ogImage }] : undefined,
		},
	};
}

export default async function ShopProductPage(props: PageProps) {
	const { t } = await getT(undefined, "shop");
	const { storeId, productId } = await props.params;

	const product = await getProductForStore(storeId, productId);
	if (!product) notFound();

	const basePrice = Number(product.price);

	const galleryImages: ShopGalleryImage[] = product.ProductImages.filter(
		(img) => (img.mediaType ?? "image") === "image",
	).map((img) => ({
		id: img.id,
		url: img.url,
		alt: img.altText?.trim() || product.name,
	}));

	const optionsPayload = [...product.ProductOptions]
		.sort((a, b) => a.sortOrder - b.sortOrder)
		.map((o) => ({
			id: o.id,
			optionName: o.optionName,
			isRequired: o.isRequired,
			isMultiple: o.isMultiple,
			minSelection: o.minSelection,
			maxSelection: o.maxSelection,
			sortOrder: o.sortOrder,
			selections: o.ProductOptionSelections.map((s) => ({
				id: s.id,
				name: s.name,
				price: Number(s.price),
				isDefault: s.isDefault,
				imageUrl: s.imageUrl,
			})),
		}));

	const categoryIds = product.ProductCategories.map((pc) => pc.categoryId);
	const related = await listMergedRelatedProductsForProduct(
		storeId,
		product.id,
		categoryIds,
		4,
	);

	const specsRecord =
		product.specsJson &&
		typeof product.specsJson === "object" &&
		!Array.isArray(product.specsJson)
			? (product.specsJson as Record<string, unknown>)
			: null;

	const compareAtNum =
		product.compareAtPrice != null ? Number(product.compareAtPrice) : null;

	const primaryImage = product.ProductImages[0];

	const glbKey = resolveGlbKey(product.slug, product.id);
	const hasCustomizerGlb = productHasCustomizerGlb(glbKey);

	return (
		<div className="space-y-12">
			<Link
				href={`/shop/${storeId}`}
				className="text-xs text-muted-foreground hover:text-foreground"
			>
				{t("shop_product_back_shop")}
			</Link>

			<div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
				<ShopProductGallery images={galleryImages} />

				<div className="flex flex-col gap-8">
					<div>
						<h1 className=" text-3xl font-light tracking-tight sm:text-4xl">
							{product.name}
						</h1>

						<ShopProductBuyPanel
							storeId={storeId}
							productId={product.id}
							name={product.name}
							currency={product.currency}
							basePrice={basePrice}
							compareAtPrice={compareAtNum}
							useOption={product.useOption}
							optionsPayload={optionsPayload}
							imageUrl={primaryImage?.url}
							hasCustomizerGlb={hasCustomizerGlb}
							customizeHref={`/shop/${storeId}/p/${product.id}/customizer`}
						/>
					</div>

					{product.description ? (
						<section>
							<h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
								{t("shop_product_story_heading")}
							</h2>
							<ProductDescriptionContent content={product.description} />
						</section>
					) : null}

					{product.careContent ? (
						<section>
							<h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
								{t("shop_product_care_heading")}
							</h2>
							<ProductDescriptionContent content={product.careContent} />
						</section>
					) : null}

					<ShopProductSpecs
						attribute={product.ProductAttribute}
						specsJson={specsRecord}
					/>

					{product.ProductCategories.length > 0 ? (
						<div className="text-xs text-muted-foreground">
							<span className="font-medium text-foreground">
								{t("shop_product_also_in")}{" "}
							</span>
							{product.ProductCategories.map((pc, i) => (
								<span key={pc.categoryId}>
									{i > 0 ? ", " : ""}
									<Link
										href={`/shop/${storeId}/c/${pc.categoryId}`}
										className="underline underline-offset-4 hover:text-foreground"
									>
										{pc.Category.name}
									</Link>
								</span>
							))}
						</div>
					) : null}
				</div>
			</div>

			<ShopRelatedProducts storeId={storeId} products={related} />
		</div>
	);
}
