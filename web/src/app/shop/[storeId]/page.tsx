import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { getT } from "@/app/i18n";
import { ShopHeroTypewriter } from "@/components/shop/shop-hero-typewriter";
import {
	listCategoriesForStore,
	listFeaturedProductsForStore,
} from "@/lib/shop/catalog";
import { parseShopHomeBlocksFromEnv } from "@/lib/shop/home-campaign";
import { getProductUnitPriceNumber } from "@/lib/shop/product-price";
import { shopProductPath } from "@/lib/shop/shop-product-path";

type Params = Promise<{ storeId: string }>;

export const revalidate = 300;

export default async function ShopHomePage(props: { params: Params }) {
	const { t, lng } = await getT(undefined, "shop");
	const { storeId } = await props.params;

	const [categories, featured, campaigns] = await Promise.all([
		listCategoriesForStore(storeId),
		listFeaturedProductsForStore(storeId, 6),
		Promise.resolve(parseShopHomeBlocksFromEnv()),
	]);

	return (
		<div className="space-y-12">
			<section className="relative overflow-hidden rounded-2xl border border-border/60 bg-linear-to-br from-muted/40 via-background to-background px-6 py-12 sm:px-10 sm:py-16">
				<div className="relative z-1 max-w-xl">
					<p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
						{t("shop_home_brand_kicker")}
					</p>
					<ShopHeroTypewriter
						text={t("shop_home_hero_title")}
						className="mt-3 text-3xl font-light tracking-tight sm:text-4xl lg:text-5xl"
					/>

					<p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
						{t("shop_home_hero_subtitle")}
					</p>

					<div className="mt-8 flex flex-wrap gap-3">
						<ButtonLink
							href={`/shop/${storeId}/p/ac73b282-837f-4451-933e-0b59961d6b76/customizer`}
						>
							{t("shop_home_cta_customize")}
						</ButtonLink>
					</div>
				</div>
			</section>

			{campaigns.length > 0 ? (
				<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{campaigns.map((b) => (
						<div
							key={b.title}
							className="rounded-xl border border-border/80 bg-card/40 p-5 sm:p-6"
						>
							<h2 className=" text-lg font-light tracking-tight">{b.title}</h2>
							<p className="mt-2 text-sm text-muted-foreground">{b.body}</p>
							{b.href ? (
								<Link
									href={b.href}
									className="mt-4 inline-block text-sm font-medium underline-offset-4 hover:underline"
								>
									{b.cta ?? t("shop_home_campaign_learn_more")}
								</Link>
							) : null}
						</div>
					))}
				</section>
			) : null}

			{featured.length > 0 ? (
				<section>
					<div className="hidden sm:block">
						<p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
							{t("shop_home_featured_kicker")}
						</p>
						<h2 className="mt-2 text-2xl font-light tracking-tight">
							{t("shop_home_featured_title")}
						</h2>
					</div>
					<ul className="grid max-sm:mt-0 gap-6 sm:mt-6 sm:grid-cols-2 lg:grid-cols-3">
						{featured.map((p, index) => {
							const img = p.ProductImages?.[0];
							const _unit = getProductUnitPriceNumber(p);
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
													{t("shop_home_no_image")}
												</div>
											)}
										</div>
										<div className="space-y-1 p-4">
											<p className="font-medium leading-snug">{p.name}</p>
											{/*
											<Currency
												as="p"
												value={unit}
												currency={p.currency}
												lng={lng}
												colored={false}
												className="text-sm text-muted-foreground"
											/>*/}
										</div>
									</Link>
								</li>
							);
						})}
					</ul>
				</section>
			) : null}

			<section>
				<p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
					{t("shop_home_collections_kicker")}
				</p>
				<h2 className="mt-2 text-2xl font-light tracking-tight sm:text-3xl">
					{t("shop_home_shop_by_category_title")}
				</h2>
				<p className="mt-2 max-w-xl text-sm text-muted-foreground">
					{t("shop_home_collections_intro")}
				</p>
				{categories.length === 0 ? (
					<p className="mt-6 text-sm text-muted-foreground">
						{t("shop_home_no_categories")}
					</p>
				) : (
					<ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{categories.map((c) => (
							<li key={c.id}>
								<Link
									href={`/shop/${storeId}/c/${c.id}`}
									className="block rounded-lg border border-border/80 bg-card/40 p-6 transition-colors hover:bg-card"
								>
									<span className="font-medium">{c.name}</span>
									<span className="mt-1 block text-xs text-muted-foreground">
										{t("shop_home_category_view_products")}
									</span>
								</Link>
							</li>
						))}
					</ul>
				)}
			</section>

			<p className="text-xs text-muted-foreground">
				{t("shop_home_customize_footer_prefix")}{" "}
				<Link
					href={`/shop/${storeId}/p/ac73b282-837f-4451-933e-0b59961d6b76/customizer`}
					className="underline underline-offset-4"
				>
					{t("shop_home_customize_footer_link")}
				</Link>
			</p>
		</div>
	);
}

function ButtonLink({
	href,
	children,
	variant = "default",
}: {
	href: string;
	children: ReactNode;
	variant?: "default" | "outline";
}) {
	const base =
		"inline-flex h-10 items-center justify-center rounded-md px-5 text-sm font-medium touch-manipulation transition-colors sm:h-9";
	const styles =
		variant === "outline"
			? "border border-border bg-background hover:bg-muted/60"
			: "bg-foreground text-background hover:bg-foreground/90";
	return (
		<Link href={href} className={`${base} ${styles}`}>
			{children}
		</Link>
	);
}
