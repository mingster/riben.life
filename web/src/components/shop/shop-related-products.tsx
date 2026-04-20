import Image from "next/image";
import Link from "next/link";

import { getT } from "@/app/i18n";
import Currency from "@/components/currency";
import type { ShopProductCard } from "@/lib/shop/catalog";
import { getProductUnitPriceNumber } from "@/lib/shop/product-price";
import { shopProductPath } from "@/lib/shop/shop-product-path";

interface ShopRelatedProductsProps {
	storeId: string;
	products: ShopProductCard[];
	/** Optional override; defaults to translated “You may also like”. */
	title?: string;
}

export async function ShopRelatedProducts({
	storeId,
	products,
	title,
}: ShopRelatedProductsProps) {
	if (products.length === 0) return null;

	const { t, lng } = await getT(undefined, "shop");
	const heading = title ?? t("shop_product_related_title");

	return (
		<section className="border-t border-border/60 pt-10">
			<h2 className="font-serif text-xl font-light tracking-tight sm:text-2xl">
				{heading}
			</h2>
			<ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{products.map((p) => {
					const img = p.ProductImages?.[0];
					const unit = getProductUnitPriceNumber(p);
					return (
						<li key={p.id}>
							<Link
								href={shopProductPath(storeId, p)}
								className="group block overflow-hidden rounded-lg border border-border/80 bg-card/30 transition-colors hover:bg-card"
							>
								<div className="relative aspect-4/5 bg-muted/40">
									{img?.url ? (
										<Image
											src={img.url}
											alt={p.ProductImages?.[0]?.altText?.trim() || p.name}
											fill
											className="h-full w-full max-w-none object-cover transition-transform duration-500 group-hover:scale-[1.02]"
											sizes="(max-width: 1024px) 50vw, 25vw"
										/>
									) : (
										<div className="flex h-full items-center justify-center text-xs text-muted-foreground">
											{t("shop_category_no_image")}
										</div>
									)}
								</div>
								<div className="space-y-1 p-3">
									<p className="line-clamp-2 text-sm font-medium leading-snug">
										{p.name}
									</p>
									<Currency
										as="p"
										value={unit}
										currency={p.currency}
										lng={lng}
										colored={false}
										className="text-xs text-muted-foreground"
									/>
								</div>
							</Link>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
