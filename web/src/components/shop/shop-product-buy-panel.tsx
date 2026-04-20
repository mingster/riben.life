"use client";

import { IconHeart } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import Currency from "@/components/currency";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { analytics } from "@/lib/analytics";
import { formatCurrencyAmount, intlLocaleFromAppLang } from "@/lib/intl-locale";
import type { ProductWithOptions } from "@/lib/shop/option-selections";
import {
	computeUnitPriceBreakdown,
	mergeOptionSelections,
} from "@/lib/shop/option-selections";
import { getProductUnitPriceWithSelections } from "@/lib/shop/product-price";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";

import {
	buildInitialShopSelections,
	type ShopOptionPayload,
	ShopProductOptions,
} from "./shop-product-options";

function buildPricingStub(
	basePrice: number,
	useOption: boolean,
	options: ShopOptionPayload[],
): ProductWithOptions {
	return {
		id: "stub",
		storeId: "stub",
		name: "",
		description: null,
		seoTitle: null,
		seoDescription: null,
		isFeatured: false,
		status: 1,
		currency: "twd",
		price: basePrice as unknown as ProductWithOptions["price"],
		useOption,
		canDelete: true,
		createdAt: BigInt(0),
		updatedAt: BigInt(0),
		ProductOptions: options.map((o) => ({
			id: o.id,
			productId: "stub",
			optionName: o.optionName,
			isRequired: o.isRequired,
			isMultiple: o.isMultiple,
			minSelection: o.minSelection,
			maxSelection: o.maxSelection,
			allowQuantity: false,
			minQuantity: 0,
			maxQuantity: 0,
			sortOrder: o.sortOrder,
			ProductOptionSelections: o.selections.map((s) => ({
				id: s.id,
				optionId: o.id,
				name: s.name,
				price: s.price,
				isDefault: s.isDefault,
				imageUrl: s.imageUrl ?? null,
			})),
		})),
	} as unknown as ProductWithOptions;
}

function shopCartLineId(
	productId: string,
	rows: { optionId: string; selectionIds: string[] }[],
): string {
	const parts = rows
		.filter((r) => r.selectionIds.length > 0)
		.map((r) => `${r.optionId}:${[...r.selectionIds].sort().join(",")}`)
		.sort();
	if (parts.length === 0) return productId;
	return `p:${productId}:${parts.join("|")}`;
}

function toItemOptions(
	options: ShopOptionPayload[],
	rows: { optionId: string; selectionIds: string[] }[],
) {
	const out: { id: string; value: string; price: number }[] = [];
	for (const r of rows) {
		if (r.selectionIds.length === 0) continue;
		const opt = options.find((o) => o.id === r.optionId);
		if (!opt) continue;
		for (const sid of r.selectionIds) {
			const sel = opt.selections.find((s) => s.id === sid);
			if (sel) {
				out.push({
					id: `${opt.id}:${sel.id}`,
					value: `${opt.optionName}: ${sel.name}`,
					price: Number(sel.price),
				});
			}
		}
	}
	return out;
}

interface ShopProductBuyPanelProps {
	/** Store segment for default customize URL when `customizeHref` is omitted. */
	storeId?: string;
	productId: string;
	name: string;
	currency: string;
	basePrice: number;
	/** Optional list / compare-at price (luxury PDP strike-through). */
	compareAtPrice?: number | null;
	useOption: boolean;
	optionsPayload: ShopOptionPayload[];
	imageUrl?: string;
	/** When true, `public/models/{glbKey}.glb` exists for this product. */
	hasCustomizerGlb?: boolean;
	/** Customize flow URL (default `/shop/p/[productId]/customizer`). */
	customizeHref?: string;
}

export function ShopProductBuyPanel({
	storeId,
	productId,
	name,
	currency,
	basePrice,
	compareAtPrice,
	useOption,
	optionsPayload,
	imageUrl,
	hasCustomizerGlb = false,
	customizeHref,
}: ShopProductBuyPanelProps) {
	const customizeLink =
		customizeHref ??
		(storeId
			? `/shop/${storeId}/p/${productId}/customizer`
			: `/shop/p/${productId}/customizer`);
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "shop");
	const priceLocale = intlLocaleFromAppLang(lng);
	const { addItem } = useCart();
	const { toggle, isSaved } = useWishlist();
	const saved = isSaved(productId);
	const wishlistLabel = saved
		? t("shop_product_remove_saved_aria")
		: t("shop_product_save_for_later_aria");

	const pricingStub = useMemo(
		() => buildPricingStub(basePrice, useOption, optionsPayload),
		[basePrice, useOption, optionsPayload],
	);

	const [selections, setSelections] = useState(() =>
		buildInitialShopSelections(optionsPayload),
	);

	const merged = useMemo(
		() => mergeOptionSelections(pricingStub, selections),
		[pricingStub, selections],
	);

	const unitPrice = useMemo(
		() => getProductUnitPriceWithSelections(pricingStub, selections),
		[pricingStub, selections],
	);

	const priceParts = useMemo(
		() => computeUnitPriceBreakdown(pricingStub, merged),
		[pricingStub, merged],
	);

	const lineId = useMemo(
		() => shopCartLineId(productId, merged),
		[productId, merged],
	);

	const itemOptions = useMemo(
		() => toItemOptions(optionsPayload, merged),
		[optionsPayload, merged],
	);

	useEffect(() => {
		analytics.trackShopViewItem({
			item_id: productId,
			item_name: name,
			price: basePrice,
			currency,
		});
	}, [productId, name, basePrice, currency]);

	return (
		<div className="flex flex-col gap-8">
			{optionsPayload.length > 0 && useOption ? (
				<ShopProductOptions
					options={optionsPayload}
					value={selections}
					onChange={setSelections}
					productCurrency={currency}
				/>
			) : null}

			<div className="space-y-2">
				<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
					{compareAtPrice != null &&
					Number.isFinite(compareAtPrice) &&
					compareAtPrice > unitPrice ? (
						<Currency
							as="p"
							value={compareAtPrice}
							currency={currency}
							lng={lng}
							colored={false}
							className="text-sm text-muted-foreground line-through"
						/>
					) : null}
					<Currency
						as="p"
						value={unitPrice}
						currency={currency}
						lng={lng}
						colored={false}
						className="text-lg text-muted-foreground"
					/>
				</div>
				{!priceParts.error && priceParts.optionExtra > 0 && (
					<ul className="text-xs text-muted-foreground">
						<li>
							{t("shop_product_price_line_base", {
								amount: formatCurrencyAmount(
									priceParts.productBase,
									currency,
									priceLocale,
								),
							})}
						</li>
						<li>
							{t("shop_product_price_line_options", {
								amount: formatCurrencyAmount(
									priceParts.optionExtra,
									currency,
									priceLocale,
								),
							})}
						</li>
					</ul>
				)}
			</div>

			<div className="flex flex-wrap items-center gap-0 sm:gap-2">
				<Button
					type="button"
					className="touch-manipulation"
					onClick={() =>
						addItem({
							id: lineId,
							productId,
							name,
							price: unitPrice,
							currency,
							quantity: 1,
							...(itemOptions.length > 0 ? { itemOptions } : {}),
							...(merged.some((r) => r.selectionIds.length > 0)
								? {
										shopOptionSelections: merged.filter(
											(r) => r.selectionIds.length > 0,
										),
									}
								: {}),
							...(imageUrl
								? { images: [{ url: imageUrl, imgPublicId: "" }] }
								: {}),
							...(!priceParts.error
								? {
										shopPriceBreakdown: {
											productBase: priceParts.productBase,
											optionExtra: priceParts.optionExtra,
											unitTotal: priceParts.unit,
										},
									}
								: {}),
						})
					}
				>
					{t("shop_product_add_to_cart")}
				</Button>

				{hasCustomizerGlb ? (
					<Button
						variant="secondary"
						className="touch-manipulation bg-amber-800/90 hover:bg-amber-500"
						asChild
					>
						<Link href={customizeLink}>{t("shop_product_customize")}</Link>
					</Button>
				) : null}

				<Button
					type="button"
					variant="outline"
					size="icon"
					className="touch-manipulation"
					aria-pressed={saved}
					aria-label={wishlistLabel}
					title={wishlistLabel}
					onClick={() => toggle({ productId, name, imageUrl })}
				>
					<IconHeart
						className={cn("size-5", saved && "fill-primary text-primary")}
					/>
				</Button>
			</div>
		</div>
	);
}
