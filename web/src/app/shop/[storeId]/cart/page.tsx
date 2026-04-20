"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/app/i18n/client";
import CartItemInfo from "@/components/cart-item-info";
import Currency from "@/components/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Item } from "@/hooks/use-cart";
import { useCart } from "@/hooks/use-cart";
import { authClient } from "@/lib/auth-client";
import type { StorefrontPickupLocation } from "@/lib/shop/storefront-fulfillment";
import { quoteStorefrontShipping } from "@/lib/shop/storefront-fulfillment";
import { useI18n } from "@/providers/i18n-provider";

interface ApiAddress {
	id: string;
	firstName: string;
	lastName: string;
	streetLine1: string;
	city: string;
	province?: string | null;
	postalCode?: string | null;
	countryId: string;
	phoneNumber: string;
	Country?: { name: string; alpha3: string };
}

interface ApiCountry {
	alpha3: string;
	name: string;
}

interface FulfillmentInfoResponse {
	freeShippingMinimum: number | null;
	shippingEtaCopy: string | null;
	pickupLocations: StorefrontPickupLocation[];
	pickupEnabled: boolean;
	defaultShippingMajor: number;
}

interface CheckoutPaymentOption {
	payUrl: string;
	name: string;
}

function checkoutProductId(item: Item): string {
	if (typeof item.productId === "string" && item.productId.length > 0) {
		return item.productId;
	}
	if (item.id.startsWith("c:")) {
		const parts = item.id.split(":");
		return parts[1] ?? item.id;
	}
	return item.id;
}

function formatAddressOneLine(a: ApiAddress): string {
	const country = a.Country?.name ?? a.countryId;
	return `${a.firstName} ${a.lastName} · ${a.streetLine1}, ${a.city} · ${country}`;
}

export default function ShopCartPage() {
	const params = useParams<{ storeId: string }>();
	const storeId = typeof params.storeId === "string" ? params.storeId : "";
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "shop");
	const cart = useCart();
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const [loading, setLoading] = useState(false);
	const [addresses, setAddresses] = useState<ApiAddress[]>([]);
	const [countries, setCountries] = useState<ApiCountry[]>([]);
	const [addressId, setAddressId] = useState<string>("");
	const [checkoutPaymentOptions, setCheckoutPaymentOptions] = useState<
		CheckoutPaymentOption[]
	>([]);
	const [paymentMethod, setPaymentMethod] = useState<string>("");

	const [inlineFirst, setInlineFirst] = useState("");
	const [inlineLast, setInlineLast] = useState("");
	const [inlineStreet, setInlineStreet] = useState("");
	const [inlineCity, setInlineCity] = useState("");
	const [inlineProvince, setInlineProvince] = useState("");
	const [inlinePostal, setInlinePostal] = useState("");
	const [inlineCountry, setInlineCountry] = useState("TWN");
	const [inlinePhone, setInlinePhone] = useState("");

	const [fulfillmentType, setFulfillmentType] = useState<"ship" | "pickup">(
		"ship",
	);
	const [pickupLocationId, setPickupLocationId] = useState("");
	const [fulfillmentInfo, setFulfillmentInfo] =
		useState<FulfillmentInfoResponse | null>(null);

	const loadAccountData = useCallback(async () => {
		const [addrRes, countryRes] = await Promise.all([
			fetch("/api/user/addresses"),
			fetch("/api/common/get-countries"),
		]);
		if (addrRes.ok) {
			const data: unknown = await addrRes.json();
			const list = Array.isArray(data) ? (data as ApiAddress[]) : [];
			setAddresses(list);
			if (list[0]) {
				setAddressId(list[0].id);
			}
		}
		if (countryRes.ok) {
			const data: unknown = await countryRes.json();
			const list = Array.isArray(data) ? (data as ApiCountry[]) : [];
			setCountries(list);
			const hasTwn = list.some((c) => c.alpha3 === "TWN");
			if (hasTwn) {
				setInlineCountry("TWN");
			} else if (list[0]) {
				setInlineCountry(list[0].alpha3);
			}
		}
	}, []);

	useEffect(() => {
		if (!storeId) {
			return;
		}
		void (async () => {
			const res = await fetch(
				`/api/shop/fulfillment-info?storeId=${encodeURIComponent(storeId)}`,
			);
			if (!res.ok) {
				return;
			}
			const data: unknown = await res.json();
			setFulfillmentInfo(data as FulfillmentInfoResponse);
		})();
	}, [storeId]);

	useEffect(() => {
		if (!storeId) {
			return;
		}
		void (async () => {
			const res = await fetch(
				`/api/shop/checkout/payment-methods?storeId=${encodeURIComponent(storeId)}`,
			);
			if (!res.ok) {
				return;
			}
			const data: unknown = await res.json();
			const raw = data as { methods?: CheckoutPaymentOption[] };
			const methods = Array.isArray(raw.methods) ? raw.methods : [];
			setCheckoutPaymentOptions(methods);
		})();
	}, [storeId]);

	useEffect(() => {
		if (checkoutPaymentOptions.length === 0) {
			return;
		}
		const ids = new Set(checkoutPaymentOptions.map((m) => m.payUrl));
		if (!paymentMethod || !ids.has(paymentMethod)) {
			setPaymentMethod(checkoutPaymentOptions[0]?.payUrl ?? "");
		}
	}, [checkoutPaymentOptions, paymentMethod]);

	useEffect(() => {
		if (!session) {
			return;
		}
		void loadAccountData();
	}, [session, loadAccountData]);

	useEffect(() => {
		if (!fulfillmentInfo?.pickupEnabled) {
			if (fulfillmentType === "pickup") {
				setFulfillmentType("ship");
			}
			return;
		}
		const first = fulfillmentInfo.pickupLocations[0];
		if (first && !pickupLocationId) {
			setPickupLocationId(first.id);
		}
	}, [fulfillmentInfo, fulfillmentType, pickupLocationId]);

	const shipQuote = useMemo(() => {
		if (!fulfillmentInfo) {
			return { shippingMajor: 0, freeShippingApplied: false };
		}
		return quoteStorefrontShipping({
			fulfillmentType,
			subtotalMajor: Number(cart.cartTotal),
			baseShippingMajor: fulfillmentInfo.defaultShippingMajor,
			freeShippingMinimum: fulfillmentInfo.freeShippingMinimum,
		});
	}, [fulfillmentInfo, fulfillmentType, cart.cartTotal]);

	const estimatedTotal = Number(cart.cartTotal) + shipQuote.shippingMajor;

	const cartCurrency = useMemo(
		() => cart.items[0]?.currency ?? "twd",
		[cart.items],
	);

	async function handleCheckout() {
		if (!storeId) {
			return;
		}
		if (!session) {
			router.push(
				`/signIn?callbackUrl=${encodeURIComponent(`/shop/${storeId}/cart`)}`,
			);
			return;
		}
		if (cart.isEmpty) {
			return;
		}
		if (!paymentMethod || checkoutPaymentOptions.length === 0) {
			toast.error(t("shop_cart_toast_checkout_title"), {
				description: t("shop_cart_no_payment_methods"),
			});
			return;
		}

		const items = cart.items.map((i) => {
			const extended = i as Item & {
				customizationData?: string;
				shopOptionSelections?: {
					optionId: string;
					selectionIds: string[];
				}[];
			};
			const customizationData =
				typeof extended.customizationData === "string" &&
				extended.customizationData.length > 0
					? extended.customizationData
					: undefined;

			const optionSelections =
				Array.isArray(extended.shopOptionSelections) &&
				extended.shopOptionSelections.length > 0
					? extended.shopOptionSelections
					: undefined;

			return {
				productId: checkoutProductId(i),
				quantity: i.quantity ?? 1,
				unitPrice: i.price,
				name: i.name,
				...(customizationData ? { customizationData } : {}),
				...(optionSelections ? { optionSelections } : {}),
			};
		});

		const payload: Record<string, unknown> = {
			storeId,
			paymentMethod,
			items,
			fulfillmentType,
		};

		if (fulfillmentType === "pickup") {
			if (!pickupLocationId) {
				toast.error(t("shop_cart_toast_checkout_title"), {
					description: t("shop_cart_toast_pickup_required"),
				});
				return;
			}
			payload.pickupLocationId = pickupLocationId;
		} else if (addresses.length > 0) {
			if (!addressId) {
				toast.error(t("shop_cart_toast_checkout_title"), {
					description: t("shop_cart_toast_address_required"),
				});
				return;
			}
			payload.shippingAddressId = addressId;
		} else {
			if (
				!inlineFirst.trim() ||
				!inlineLast.trim() ||
				!inlineStreet.trim() ||
				!inlineCity.trim() ||
				!inlinePhone.trim() ||
				!inlineCountry
			) {
				toast.error(t("shop_cart_toast_checkout_title"), {
					description: t("shop_cart_toast_shipping_fields"),
				});
				return;
			}
			payload.shippingAddressInline = {
				firstName: inlineFirst.trim(),
				lastName: inlineLast.trim(),
				streetLine1: inlineStreet.trim(),
				city: inlineCity.trim(),
				province: inlineProvince.trim() || undefined,
				postalCode: inlinePostal.trim() || undefined,
				countryId: inlineCountry,
				phoneNumber: inlinePhone.trim(),
			};
		}

		setLoading(true);
		try {
			const res = await fetch("/api/shop/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			const data: { url?: string; error?: string } = await res.json();

			if (!res.ok) {
				toast.error(t("shop_cart_toast_checkout_title"), {
					description: data.error ?? t("shop_cart_toast_checkout_failed"),
				});
				return;
			}

			if (data.url) {
				window.location.href = data.url;
				return;
			}

			toast.error(t("shop_cart_toast_checkout_title"), {
				description: t("shop_cart_toast_no_redirect"),
			});
		} catch {
			toast.error(t("shop_cart_toast_checkout_title"), {
				description: t("shop_cart_toast_generic_error"),
			});
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="space-y-8">
			<div>
				<h1 className="font-serif text-3xl font-light tracking-tight">
					{t("shop_cart_title")}
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					{t("shop_cart_intro")}
				</p>
				{fulfillmentInfo?.shippingEtaCopy ? (
					<p className="mt-2 text-sm text-muted-foreground">
						{fulfillmentInfo.shippingEtaCopy}
					</p>
				) : null}
				{fulfillmentInfo?.freeShippingMinimum != null &&
				fulfillmentInfo.freeShippingMinimum > 0 ? (
					<p className="mt-1 text-xs text-muted-foreground">
						{t("shop_cart_free_shipping_prefix")}{" "}
						<Currency
							value={fulfillmentInfo.freeShippingMinimum}
							currency={cartCurrency}
							lng={lng}
							colored={false}
							as="span"
							className="text-muted-foreground"
						/>{" "}
						{t("shop_cart_free_shipping_suffix")}
					</p>
				) : null}
			</div>

			{cart.isEmpty ? (
				<p className="text-sm text-muted-foreground">{t("shop_cart_empty")}</p>
			) : (
				<>
					<ul className="divide-y divide-border rounded-lg border border-border/80">
						{cart.items.map((item) => (
							<li key={item.id} className="flex gap-4 p-4">
								<CartItemInfo
									item={item}
									showProductImg
									showQuantity
									showVarity
									showSubtotal
									classNames="flex w-full flex-1"
								/>
							</li>
						))}
					</ul>

					{session ? (
						<div className="space-y-6 rounded-lg border border-border/80 p-4 sm:p-5">
							{fulfillmentInfo?.pickupEnabled ? (
								<div>
									<Label className="text-sm font-medium">
										{t("shop_cart_fulfillment_label")}
									</Label>
									<RadioGroup
										value={fulfillmentType}
										onValueChange={(v) =>
											setFulfillmentType(v as "ship" | "pickup")
										}
										className="mt-3 grid gap-3 sm:grid-cols-2"
									>
										<label className="flex cursor-pointer items-center gap-2 rounded-md border border-border/80 px-3 py-2 text-sm touch-manipulation">
											<RadioGroupItem value="ship" id="ful-ship" />
											<span>{t("shop_cart_ship_to_address")}</span>
										</label>
										<label className="flex cursor-pointer items-center gap-2 rounded-md border border-border/80 px-3 py-2 text-sm touch-manipulation">
											<RadioGroupItem value="pickup" id="ful-pickup" />
											<span>{t("shop_cart_click_collect")}</span>
										</label>
									</RadioGroup>
									{fulfillmentType === "pickup" ? (
										<div className="mt-4 space-y-2">
											<Label htmlFor="pickup-loc">
												{t("shop_cart_pickup_location_label")}
											</Label>
											<Select
												value={
													pickupLocationId ||
													fulfillmentInfo.pickupLocations[0]?.id ||
													""
												}
												onValueChange={setPickupLocationId}
											>
												<SelectTrigger
													id="pickup-loc"
													className="h-10 text-base sm:text-sm touch-manipulation"
												>
													<SelectValue
														placeholder={t(
															"shop_cart_pickup_location_placeholder",
														)}
													/>
												</SelectTrigger>
												<SelectContent>
													{fulfillmentInfo.pickupLocations.map((loc) => (
														<SelectItem key={loc.id} value={loc.id}>
															{loc.name} — {loc.city}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									) : null}
								</div>
							) : null}

							<div>
								<Label className="text-sm font-medium">
									{t("shop_cart_payment_label")}
								</Label>
								{checkoutPaymentOptions.length === 0 ? (
									<p className="mt-2 text-sm text-muted-foreground">
										{t("shop_cart_no_payment_methods")}
									</p>
								) : (
									<RadioGroup
										value={paymentMethod}
										onValueChange={setPaymentMethod}
										className="mt-3 grid gap-3 sm:grid-cols-2"
									>
										{checkoutPaymentOptions.map((m) => {
											const label =
												m.payUrl === "stripe"
													? t("shop_cart_payment_stripe")
													: m.payUrl === "linepay"
														? t("shop_cart_payment_linepay")
														: m.name;
											return (
												<label
													key={m.payUrl}
													className="flex cursor-pointer items-center gap-2 rounded-md border border-border/80 px-3 py-2 text-sm touch-manipulation"
												>
													<RadioGroupItem
														value={m.payUrl}
														id={`pay-${m.payUrl}`}
													/>
													<span>{label}</span>
												</label>
											);
										})}
									</RadioGroup>
								)}
							</div>

							{fulfillmentType === "ship" ? (
								<div>
									<Label className="text-sm font-medium">
										{t("shop_cart_shipping_label")}
									</Label>
									{addresses.length > 0 ? (
										<RadioGroup
											value={addressId}
											onValueChange={setAddressId}
											className="mt-3 grid gap-2"
										>
											{addresses.map((a) => (
												<label
													key={a.id}
													className="flex cursor-pointer items-start gap-2 rounded-md border border-border/80 px-3 py-2 text-sm touch-manipulation"
												>
													<RadioGroupItem value={a.id} id={`addr-${a.id}`} />
													<span className="text-muted-foreground">
														{formatAddressOneLine(a)}
													</span>
												</label>
											))}
										</RadioGroup>
									) : (
										<div className="mt-3 grid gap-3 sm:grid-cols-2">
											<div className="space-y-2">
												<Label htmlFor="ship-first">
													{t("shop_cart_field_first_name")}
												</Label>
												<Input
													id="ship-first"
													className="h-10 text-base sm:text-sm touch-manipulation"
													value={inlineFirst}
													onChange={(e) => setInlineFirst(e.target.value)}
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="ship-last">
													{t("shop_cart_field_last_name")}
												</Label>
												<Input
													id="ship-last"
													className="h-10 text-base sm:text-sm touch-manipulation"
													value={inlineLast}
													onChange={(e) => setInlineLast(e.target.value)}
												/>
											</div>
											<div className="space-y-2 sm:col-span-2">
												<Label htmlFor="ship-street">
													{t("shop_cart_field_address_line1")}
												</Label>
												<Input
													id="ship-street"
													className="h-10 text-base sm:text-sm touch-manipulation"
													value={inlineStreet}
													onChange={(e) => setInlineStreet(e.target.value)}
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="ship-city">
													{t("shop_cart_field_city")}
												</Label>
												<Input
													id="ship-city"
													className="h-10 text-base sm:text-sm touch-manipulation"
													value={inlineCity}
													onChange={(e) => setInlineCity(e.target.value)}
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="ship-prov">
													{t("shop_cart_field_province")}
												</Label>
												<Input
													id="ship-prov"
													className="h-10 text-base sm:text-sm touch-manipulation"
													value={inlineProvince}
													onChange={(e) => setInlineProvince(e.target.value)}
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="ship-post">
													{t("shop_cart_field_postal")}
												</Label>
												<Input
													id="ship-post"
													className="h-10 text-base sm:text-sm touch-manipulation"
													value={inlinePostal}
													onChange={(e) => setInlinePostal(e.target.value)}
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="ship-phone">
													{t("shop_cart_field_phone")}
												</Label>
												<Input
													id="ship-phone"
													type="tel"
													className="h-10 text-base sm:text-sm touch-manipulation"
													value={inlinePhone}
													onChange={(e) => setInlinePhone(e.target.value)}
												/>
											</div>
											<div className="space-y-2">
												<Label>{t("shop_cart_field_country")}</Label>
												<Select
													value={inlineCountry}
													onValueChange={setInlineCountry}
												>
													<SelectTrigger className="h-10 text-base sm:text-sm touch-manipulation">
														<SelectValue
															placeholder={t("shop_cart_country_placeholder")}
														/>
													</SelectTrigger>
													<SelectContent>
														{countries.map((c) => (
															<SelectItem key={c.alpha3} value={c.alpha3}>
																{c.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
											<p className="text-xs text-muted-foreground sm:col-span-2">
												{t("shop_cart_inline_address_hint")}
											</p>
										</div>
									)}
								</div>
							) : null}
						</div>
					) : null}

					<div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
						<div className="space-y-1 text-sm">
							<div className="flex flex-wrap items-baseline gap-2">
								<span className="text-muted-foreground">
									{t("shop_cart_subtotal")}
								</span>
								<Currency
									value={Number(cart.cartTotal)}
									currency={cartCurrency}
									lng={lng}
								/>
							</div>
							{session ? (
								<div className="flex flex-wrap items-baseline gap-2">
									<span className="text-muted-foreground">
										{t("shop_cart_est_shipping")}
									</span>
									{shipQuote.freeShippingApplied ? (
										<span className="font-medium text-green-600">
											{t("shop_cart_shipping_free")}
										</span>
									) : (
										<Currency
											value={shipQuote.shippingMajor}
											currency={cartCurrency}
											lng={lng}
										/>
									)}
								</div>
							) : null}
							<div className="flex flex-wrap items-baseline gap-2 text-lg font-medium">
								<span>{t("shop_cart_est_total")}</span>
								<Currency
									value={session ? estimatedTotal : Number(cart.cartTotal)}
									currency={cartCurrency}
									lng={lng}
								/>
							</div>
						</div>
						<Button
							type="button"
							size="lg"
							className="touch-manipulation sm:min-w-[200px]"
							disabled={
								loading || (!!session && checkoutPaymentOptions.length === 0)
							}
							onClick={handleCheckout}
						>
							{loading
								? t("shop_cart_checkout_redirecting")
								: t("shop_cart_checkout_button")}
						</Button>
					</div>
				</>
			)}
		</div>
	);
}
