import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getT } from "@/app/i18n";
import Currency from "@/components/currency";
import { ShopPlpToolbar } from "@/components/shop/shop-plp-toolbar";
import {
	getCategoryForStore,
	listProductsInCategory,
	parseShopPlpSort,
} from "@/lib/shop/catalog";
import { getProductUnitPriceNumber } from "@/lib/shop/product-price";
import { shopProductPath } from "@/lib/shop/shop-product-path";

interface PageProps {
	params: Promise<{ storeId: string; categoryId: string }>;
	searchParams: Promise<{ q?: string; sort?: string }>;
}

export const revalidate = 300;

export default async function ShopCategoryPage(props: PageProps) {
	const { t, lng } = await getT(undefined, "shop");
	const { storeId, categoryId } = await props.params;
	const sp = await props.searchParams;

	const category = await getCategoryForStore(storeId, categoryId);
	if (!category) notFound();

	const q = typeof sp.q === "string" ? sp.q : "";
	const sort = parseShopPlpSort(
		typeof sp.sort === "string" ? sp.sort : undefined,
	);

	const products = await listProductsInCategory(storeId, categoryId, {
		q: q || undefined,
		sort,
	});

	return (
		<div className="space-y-8">
			<div>
				<Link
					href={`/shop/${storeId}`}
					className="text-xs text-muted-foreground hover:text-foreground"
				>
					{t("shop_category_back_collections")}
				</Link>
				<h1 className="mt-4 font-serif text-3xl font-light tracking-tight sm:text-4xl">
					{category.name}
				</h1>
			</div>

			<Suspense
				fallback={
					<div
						className="h-24 animate-pulse rounded-md bg-muted/40"
						aria-hidden
					/>
				}
			>
				<ShopPlpToolbar initialQ={q} initialSort={sort} />
			</Suspense>

			{products.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					{q.trim()
						? t("shop_category_empty_search")
						: t("shop_category_empty")}
				</p>
			) : (
				<ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{products.map((p, index) => {
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
												alt={img.altText?.trim() || p.name}
												fill
												className="h-full w-full max-w-none object-cover transition-transform duration-500 group-hover:scale-[1.02]"
												sizes="(max-width: 768px) 100vw, 33vw"
												priority={index === 0}
											/>
										) : (
											<div className="flex h-full items-center justify-center text-xs text-muted-foreground">
												{t("shop_category_no_image")}
											</div>
										)}
									</div>
									<div className="space-y-1 p-4">
										<p className="font-medium leading-snug">{p.name}</p>
										<Currency
											as="p"
											value={unit}
											currency={p.currency}
											lng={lng}
											colored={false}
											className="text-sm text-muted-foreground"
										/>
									</div>
								</Link>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
