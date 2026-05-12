"use client";

import { useGLTF } from "@react-three/drei";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { addCustomizedProductToCart } from "@/actions/product/customize-product";
import { upsertSavedCustomizationAction } from "@/actions/user/saved-customization/upsert-saved-customization";
import { useTranslation } from "@/app/i18n/client";
import Currency from "@/components/currency";
import { Bag3DCanvas } from "@/components/customizer/bag-3d-canvas";
import { CustomizerControls } from "@/components/customizer/customizer-controls";
import { Loader } from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/use-cart";
import {
	listSavedDesigns,
	removeSavedDesignByProductId,
	useSavedDesigns,
} from "@/hooks/use-saved-designs";
import { analytics } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import {
	deserializeCustomization,
	estimateCustomizationPrice,
	getCustomizationSummary,
	serializeCustomization,
} from "@/lib/product/customization-utils";
import { formatCurrencyAmount, intlLocaleFromAppLang } from "@/lib/intl-locale";
import { customizedCartLineId } from "@/lib/shop/cart-line-id";
import type { ShopLinePriceBreakdown } from "@/lib/shop/line-price-breakdown";
import { useI18n } from "@/providers/i18n-provider";
import type { BagCustomization } from "@/types/customizer";
import { DEFAULT_CUSTOMIZATION } from "@/types/customizer";

export interface ProductCustomizeClientProps {
	storeId: string;
	productId: string;
	productName: string;
	currency: string;
	productBase: number;
	optionExtra: number;
	unitWithDefaults: number;
	/** Public URL for this product’s GLB (`/models/{glbKey}.glb`). */
	glbUrl: string;
	/** Merged defaults + product reference dimensions from the server. */
	initialCustomization?: BagCustomization;
}

export function ProductCustomizeClient({
	storeId,
	productId,
	productName,
	currency,
	productBase,
	optionExtra,
	unitWithDefaults,
	glbUrl,
	initialCustomization,
}: ProductCustomizeClientProps) {
	const baseline = initialCustomization ?? DEFAULT_CUSTOMIZATION;

	useEffect(() => {
		analytics.trackShopCustomizeStart({
			item_id: productId,
			item_name: productName,
		});
	}, [productId, productName]);

	useEffect(() => {
		useGLTF.preload(glbUrl);
	}, [glbUrl]);

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "customized");
	const { t: tShop } = useTranslation(lng, "shop");

	const [customization, setCustomization] = useState<BagCustomization>(() => ({
		...baseline,
	}));
	const [photoRepositionMode, setPhotoRepositionMode] = useState(false);
	const [quantity, setQuantity] = useState(1);
	const [isLoading, setIsLoading] = useState(false);
	const [isSavingDesign, setIsSavingDesign] = useState(false);
	const pathname = usePathname();
	const { data: session } = authClient.useSession();
	const { addItem } = useCart();
	const { save: saveDesign } = useSavedDesigns();

	const signInHref = `/signIn?callbackUrl=${encodeURIComponent(pathname || `/shop/${storeId}`)}`;

	useEffect(() => {
		if (session?.user) {
			return;
		}
		const entry = listSavedDesigns().find((e) => e.productId === productId);
		if (entry) {
			setCustomization(deserializeCustomization(entry.customizationJson));
		}
	}, [productId, session?.user]);

	const estimatedUnit = useMemo(
		() => estimateCustomizationPrice(unitWithDefaults, customization),
		[unitWithDefaults, customization],
	);

	const customizationSurcharge = useMemo(
		() => Math.max(0, estimatedUnit - unitWithDefaults),
		[estimatedUnit, unitWithDefaults],
	);

	const handleAddToCart = async () => {
		setIsLoading(true);
		try {
			const result = await addCustomizedProductToCart({
				productId,
				customization,
				quantity,
			});

			if (result?.serverError) {
				toast.error(result.serverError);
			} else if (
				result?.data &&
				typeof result.data === "object" &&
				"unitPrice" in result.data
			) {
				const d = result.data as {
					customizationJson: string;
					productId: string;
					productName: string;
					quantity: number;
					unitPrice: number;
					priceBreakdown?: ShopLinePriceBreakdown;
				};
				const breakdown: ShopLinePriceBreakdown = d.priceBreakdown ?? {
					productBase,
					optionExtra,
					customizationSurcharge,
					unitTotal: d.unitPrice,
				};
				addItem({
					id: customizedCartLineId(d.productId, d.customizationJson),
					productId: d.productId,
					name: d.productName,
					price: d.unitPrice,
					currency,
					quantity: d.quantity,
					customizationData: d.customizationJson,
					shopPriceBreakdown: breakdown,
				});
				toast.success(t("toast_added_to_cart"));
			} else {
				toast.error(t("toast_failed_add_to_cart"));
			}
		} catch (error) {
			toast.error(t("toast_error_generic"));
			console.error(error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSaveDesign = async () => {
		if (session?.user) {
			setIsSavingDesign(true);
			try {
				const result = await upsertSavedCustomizationAction({
					productId,
					productName,
					customization,
				});
				if (result?.serverError) {
					toast.error(result.serverError);
					return;
				}
				removeSavedDesignByProductId(productId);
				toast.success(t("toast_design_saved_account"));
			} catch {
				toast.error(t("toast_error_generic"));
			} finally {
				setIsSavingDesign(false);
			}
			return;
		}

		saveDesign({
			productId,
			productName,
			customizationJson: serializeCustomization(customization),
		});
		toast.success(t("toast_design_saved_local"));
	};

	const handleResetCustomization = () => {
		setCustomization({ ...baseline });
		setPhotoRepositionMode(false);
	};

	const handleCustomizationPatch = useCallback(
		(patch: Partial<BagCustomization>) => {
			setCustomization((prev) => ({ ...prev, ...patch }));
		},
		[],
	);

	const priceLocale = intlLocaleFromAppLang(lng);
	const fmt = (n: number) => formatCurrencyAmount(n, currency, priceLocale);

	return (
		<div className="space-y-12">
			<nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
				<Link href={`/shop/${storeId}`} className="hover:text-foreground">
					{tShop("shop_product_back_shop")}
				</Link>
				<span aria-hidden>/</span>
				<Link
					href={`/shop/${storeId}/p/${productId}`}
					className="max-w-[200px] truncate hover:text-foreground"
					title={productName}
				>
					{productName}
				</Link>
				<span aria-hidden>/</span>
				<span className="text-foreground">{t("nav_customize")}</span>
			</nav>

			<header className="border-b border-border/60 pb-6 sm:pb-8">
				<p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
					{t("eyebrow_product_named", { name: productName })}
				</p>
				<h1 className="mt-2 text-3xl font-light tracking-tight text-foreground sm:text-4xl">
					{t("title_my_design")}
				</h1>
				<p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
					{t("intro_product")}
				</p>
			</header>

			<div className="flex min-w-0 flex-col gap-10">
				<div className="relative h-[min(48vh,420px)] w-full min-h-0 overflow-hidden rounded-lg border border-border/60 bg-muted/30 sm:h-[min(52vh,560px)]">
					<Suspense fallback={<Loader />}>
						<Bag3DCanvas
							glbUrl={glbUrl}
							customization={customization}
							onCustomizationChange={handleCustomizationPatch}
							photoRepositionMode={photoRepositionMode}
							onPhotoRepositionModeChange={setPhotoRepositionMode}
						/>
					</Suspense>
				</div>

				<div className="flex w-full min-w-0 flex-col gap-8">
					<CustomizerControls
						customization={customization}
						onChange={setCustomization}
						onPhotoRepositionModeChange={setPhotoRepositionMode}
						photoRepositionMode={photoRepositionMode}
					/>

					<div className="flex flex-col gap-8">
						<div className="space-y-2">
							<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
								<Currency
									as="p"
									value={estimatedUnit}
									currency={currency}
									lng={lng}
									colored={false}
									className="text-lg text-muted-foreground"
								/>
							</div>
							<ul className="space-y-1 text-xs text-muted-foreground">
								<li className="flex justify-between gap-4">
									<span>{t("price_base")}</span>
									<span className="text-foreground">{fmt(productBase)}</span>
								</li>
								{optionExtra > 0 && (
									<li className="flex justify-between gap-4">
										<span>{t("price_options")}</span>
										<span className="text-foreground">+{fmt(optionExtra)}</span>
									</li>
								)}
								<li className="flex justify-between gap-4">
									<span>{t("price_configured_subtotal")}</span>
									<span className="text-foreground">
										{fmt(unitWithDefaults)}
									</span>
								</li>
								{customizationSurcharge > 0 && (
									<li className="flex justify-between gap-4">
										<span>{t("price_customization")}</span>
										<span className="text-foreground">
											+{fmt(customizationSurcharge)}
										</span>
									</li>
								)}
							</ul>
							<p className="text-xs text-muted-foreground">
								{t("price_total_items", {
									count: quantity,
									total: fmt(estimatedUnit * quantity),
								})}
							</p>
						</div>

						<div>
							<label
								htmlFor="customizer-quantity-product"
								className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
							>
								{t("quantity_label")}
							</label>
							<div className="mt-2 flex max-w-xs items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="icon"
									className="h-10 w-10 shrink-0 touch-manipulation sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0"
									onClick={() => setQuantity(Math.max(1, quantity - 1))}
								>
									−
								</Button>
								<Input
									id="customizer-quantity-product"
									type="number"
									min={1}
									value={quantity}
									onChange={(e) =>
										setQuantity(Math.max(1, Number(e.target.value)))
									}
									className="h-10 flex-1 text-center text-base sm:h-9 sm:text-sm"
								/>
								<Button
									type="button"
									variant="outline"
									size="icon"
									className="h-10 w-10 shrink-0 touch-manipulation sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0"
									onClick={() => setQuantity(quantity + 1)}
								>
									+
								</Button>
							</div>
						</div>

						<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
							<Button
								onClick={handleAddToCart}
								disabled={isLoading || isSavingDesign}
								className="touch-manipulation"
							>
								{isLoading ? t("add_to_bag_loading") : t("add_to_bag")}
							</Button>
							<Button
								type="button"
								onClick={handleSaveDesign}
								variant="outline"
								disabled={isSavingDesign}
								className="touch-manipulation"
							>
								{isSavingDesign ? t("save_design_saving") : t("save_design")}
							</Button>
							<Button
								type="button"
								onClick={handleResetCustomization}
								variant="outline"
								disabled={isSavingDesign}
								className="touch-manipulation"
							>
								{t("reset_design")}
							</Button>
						</div>
						{!session?.user ? (
							<p className="text-xs text-muted-foreground">
								<Link
									href={signInHref}
									className="font-medium text-primary underline-offset-2 hover:underline"
								>
									{t("save_design_sign_in_link")}
								</Link>
								{" — "}
								{t("save_design_sign_in_hint")}
							</p>
						) : null}
					</div>
				</div>

				<section className="w-full min-w-0 border-t border-border/60 pt-10">
					<h3 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
						{t("configuration_title")}
					</h3>
					<p className="prose prose-sm dark:prose-invert mt-4 max-w-none text-muted-foreground">
						{getCustomizationSummary(customization, t)}
					</p>
				</section>
			</div>

			<section>
				<h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
					{t("materials_section_title")}
				</h2>
				<p className="prose prose-sm dark:prose-invert mt-4 max-w-3xl text-muted-foreground">
					{t("materials_section_simplified")}
				</p>
			</section>
		</div>
	);
}
