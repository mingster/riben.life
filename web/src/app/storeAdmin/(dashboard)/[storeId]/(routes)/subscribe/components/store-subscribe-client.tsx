"use client";

import {
	Elements,
	LinkAuthenticationElement,
	PaymentElement,
	useElements,
	useStripe,
} from "@stripe/react-stripe-js";
import type { Appearance, StripeElementsOptions } from "@stripe/stripe-js";
import { IconCheck } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipLoader } from "react-spinners";
import { changeStoreSubscriptionIntervalAction } from "@/actions/storeAdmin/subscription/change-store-subscription-interval";
import { downgradeStoreToFreeAction } from "@/actions/storeAdmin/subscription/downgrade-store-to-free";
import { useTranslation } from "@/app/i18n/client";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { CustomSessionUser } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import logger from "@/lib/logger";
import getStripe from "@/lib/payment/stripe/client";
import { appLngToStripeElementsLocale } from "@/lib/payment/stripe/elements-locale";
import { formatInternalMinorForDisplay } from "@/lib/payment/stripe/stripe-money";
import {
	approxYearlySavingsPercent,
	DEFAULT_SUBSCRIPTION_MULTI_YEARLY_UNIT_AMOUNT,
	DEFAULT_SUBSCRIPTION_PRO_YEARLY_UNIT_AMOUNT,
	type SerializedGroupedSubscriptionPrices,
	type SerializedSubscriptionPriceSlot,
} from "@/lib/subscription/resolve-product-prices";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import { StoreLevel, SubscriptionStatus } from "@/types/enum";
import { getAbsoluteUrl } from "@/utils/utils";

/** Dedupe parallel POSTs (e.g. React Strict Mode double mount) per checkout row. */
const subscriptionCheckoutInflight = new Map<
	string,
	Promise<{
		ok: boolean;
		client_secret?: string;
		message?: string;
	}>
>();

async function fetchStoreSubscriptionCheckoutClientSecret(input: {
	storeId: string;
	subscriptionPaymentId: string;
}): Promise<{
	ok: boolean;
	client_secret?: string;
	message?: string;
}> {
	const key = input.subscriptionPaymentId;
	const existing = subscriptionCheckoutInflight.get(key);
	if (existing) {
		return existing;
	}
	const promise = (async () => {
		try {
			const res = await fetch(
				"/api/payment/stripe/create-store-subscription-checkout",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						storeId: input.storeId,
						subscriptionPaymentId: input.subscriptionPaymentId,
					}),
				},
			);
			const data = (await res.json()) as {
				client_secret?: string;
				message?: string;
			};
			if (!res.ok) {
				return {
					ok: false,
					message:
						typeof data?.message === "string"
							? data.message
							: "Failed to start payment",
				};
			}
			if (!data?.client_secret) {
				return { ok: false, message: "Missing payment session" };
			}
			return { ok: true, client_secret: data.client_secret };
		} catch (err: unknown) {
			return {
				ok: false,
				message: err instanceof Error ? err.message : "Failed to start payment",
			};
		} finally {
			subscriptionCheckoutInflight.delete(key);
		}
	})();
	subscriptionCheckoutInflight.set(key, promise);
	return promise;
}

type Billing = "month" | "year";

type PrepareState = {
	subscriptionPaymentId: string;
	/**
	 * App **internal minor** (major × 100). POSTed as `total`; the API maps to Stripe PI `amount` via
	 * `internalMinorToStripeUnit` (TWD/USD: same integer as Stripe subunits; JPY/KRW: Stripe uses whole majors).
	 */
	amount: number;
	currency: string;
	stripeCustomerId: string;
	interval: string | null;
	productName: string | null;
};

interface StoreSubscribeClientProps {
	storeId: string;
	groupedPrices: SerializedGroupedSubscriptionPrices;
	storeLevel: number;
	subscriptionExpirationMs: number | null;
	productLabel: string | null;
	stripeSubscriptionId?: string | null;
	stripeBillingInterval?: "month" | "year" | null;
	storeSubscriptionStatus?: number | null;
}

/** `slot.unitAmount` is internal minor (major×100); same encoding as checkout. */
function formatSlotPrice(
	slot: SerializedSubscriptionPriceSlot | undefined,
	locale: string,
): string {
	if (!slot?.unitAmount) {
		return "—";
	}
	return formatInternalMinorForDisplay(slot.currency, slot.unitAmount, locale);
}

/** Effective monthly share of an annual price (slot total is internal minor for the year). */
function formatYearlyEffectivePerMonth(
	slot: SerializedSubscriptionPriceSlot | undefined,
	locale: string,
): string {
	if (!slot?.unitAmount) {
		return "—";
	}
	const perMonthInternal = Math.round(slot.unitAmount / 12);
	return formatInternalMinorForDisplay(slot.currency, perMonthInternal, locale);
}

/**
 * When yearly Stripe prices are missing, show display-only annual totals matching install
 * defaults (Pro effective 300/mo, Multi 600/mo × 12 in minor units). Checkout uses `checkout` only.
 */
function resolveTierSlotsForBilling(
	billing: Billing,
	tierKey: "pro" | "multi",
	tier: SerializedGroupedSubscriptionPrices["pro"],
): {
	display: SerializedSubscriptionPriceSlot | undefined;
	checkout: SerializedSubscriptionPriceSlot | undefined;
	isYearlyEstimated: boolean;
} {
	const month = tier.month;
	const year = tier.year;
	if (billing === "month") {
		return {
			display: month,
			checkout: month,
			isYearlyEstimated: false,
		};
	}
	if (year?.unitAmount) {
		return {
			display: year,
			checkout: year,
			isYearlyEstimated: false,
		};
	}
	if (month?.unitAmount) {
		const estimatedTotal =
			tierKey === "multi"
				? DEFAULT_SUBSCRIPTION_MULTI_YEARLY_UNIT_AMOUNT
				: DEFAULT_SUBSCRIPTION_PRO_YEARLY_UNIT_AMOUNT;
		return {
			display: {
				id: month.id,
				unitAmount: estimatedTotal,
				currency: month.currency,
				interval: "year",
			},
			checkout: undefined,
			isYearlyEstimated: true,
		};
	}
	return {
		display: undefined,
		checkout: undefined,
		isYearlyEstimated: false,
	};
}

function currentPlanKey(
	level: number,
	expMs: number | null,
): "free" | "pro" | "multi" {
	const now = Date.now();
	const active =
		expMs != null &&
		expMs > now &&
		(level === StoreLevel.Pro || level === StoreLevel.Multi);
	if (!active) {
		return "free";
	}
	if (level === StoreLevel.Multi) {
		return "multi";
	}
	return "pro";
}

export default function StoreSubscribeClient({
	storeId,
	groupedPrices,
	storeLevel,
	subscriptionExpirationMs,
	productLabel: _productLabel,
	stripeSubscriptionId = null,
	stripeBillingInterval = null,
	storeSubscriptionStatus = null,
}: StoreSubscribeClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const router = useRouter();
	const localeTag = lng === "tw" ? "zh-TW" : "en-US";

	const [billing, setBilling] = useState<Billing>(() =>
		stripeBillingInterval === "year" ? "year" : "month",
	);

	useEffect(() => {
		if (stripeBillingInterval === "year" || stripeBillingInterval === "month") {
			setBilling(stripeBillingInterval);
		}
	}, [stripeBillingInterval]);
	const [prep, setPrep] = useState<PrepareState | null>(null);
	const [prepareLoading, setPrepareLoading] = useState(false);
	const [prepareError, setPrepareError] = useState<string | undefined>();
	const [freeModalOpen, setFreeModalOpen] = useState(false);
	const [freeLoading, setFreeLoading] = useState(false);
	const [monthlyModalOpen, setMonthlyModalOpen] = useState(false);
	const [yearlyModalOpen, setYearlyModalOpen] = useState(false);
	const [intervalLoading, setIntervalLoading] = useState(false);

	const plan = useMemo(
		() => currentPlanKey(storeLevel, subscriptionExpirationMs),
		[storeLevel, subscriptionExpirationMs],
	);

	const proResolved = useMemo(
		() => resolveTierSlotsForBilling(billing, "pro", groupedPrices.pro),
		[billing, groupedPrices.pro],
	);
	const multiResolved = useMemo(
		() => resolveTierSlotsForBilling(billing, "multi", groupedPrices.multi),
		[billing, groupedPrices.multi],
	);
	const proDisplay = proResolved.display;
	const proCheckout = proResolved.checkout;
	const proYearlyEstimated = proResolved.isYearlyEstimated;
	const multiDisplay = multiResolved.display;
	const multiCheckout = multiResolved.checkout;
	const multiYearlyEstimated = multiResolved.isYearlyEstimated;

	const savingsPro = approxYearlySavingsPercent(
		groupedPrices.pro.month,
		groupedPrices.pro.year,
	);
	const savingsMulti = approxYearlySavingsPercent(
		groupedPrices.multi.month,
		groupedPrices.multi.year,
	);
	const savingsPercent =
		billing === "year" ? (savingsPro ?? savingsMulti) : null;

	/** Same paid tier and same cadence as Stripe → show current plan, disable CTA. */
	const proIsCurrentCadence =
		plan === "pro" &&
		(stripeBillingInterval == null || stripeBillingInterval === billing);
	const multiIsCurrentCadence =
		plan === "multi" &&
		(stripeBillingInterval == null || stripeBillingInterval === billing);

	const proFooterDisabled =
		prepareLoading ||
		proIsCurrentCadence ||
		(plan !== "pro" && !proCheckout) ||
		(plan === "pro" &&
			!proIsCurrentCadence &&
			billing === "year" &&
			!proCheckout);
	const multiFooterDisabled =
		prepareLoading ||
		multiIsCurrentCadence ||
		(plan !== "multi" && !multiCheckout) ||
		(plan === "multi" &&
			!multiIsCurrentCadence &&
			billing === "year" &&
			!multiCheckout);

	const runPrepare = useCallback(
		async (stripePriceId: string) => {
			setPrepareLoading(true);
			setPrepareError(undefined);
			try {
				const res = await fetch(
					`/api/storeAdmin/${encodeURIComponent(storeId)}/subscribe`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ stripePriceId }),
					},
				);
				const data = (await res.json()) as {
					subscriptionPayment?: { id: string };
					stripeCustomerId?: string;
					amount?: number;
					currency?: string;
					interval?: string | null;
					productName?: string | null;
					message?: string;
				};
				if (!res.ok) {
					setPrepareError(
						typeof data?.message === "string"
							? data.message
							: t("store_subscribe_prepare_failed"),
					);
					return;
				}
				if (
					!data.subscriptionPayment?.id ||
					data.stripeCustomerId == null ||
					data.amount == null ||
					data.currency == null
				) {
					setPrepareError(t("store_subscribe_prepare_failed"));
					return;
				}
				setPrep({
					subscriptionPaymentId: data.subscriptionPayment.id,
					amount: data.amount,
					currency: data.currency,
					stripeCustomerId: data.stripeCustomerId,
					interval: data.interval ?? null,
					productName: data.productName ?? null,
				});
			} catch (err: unknown) {
				setPrepareError(
					err instanceof Error
						? err.message
						: t("store_subscribe_prepare_failed"),
				);
			} finally {
				setPrepareLoading(false);
			}
		},
		[storeId, t],
	);

	const onUnsubscribeFree = async () => {
		setFreeLoading(true);
		try {
			const result = await downgradeStoreToFreeAction(storeId, {});
			if (result?.serverError) {
				toastError({
					title: t("store_admin_subscribe_error_title"),
					description: result.serverError,
				});
				return;
			}
			toastSuccess({ description: t("store_subscribe_free_switched") });
			setFreeModalOpen(false);
			router.push(`/storeAdmin/${storeId}`);
		} catch (err: unknown) {
			toastError({
				title: t("store_admin_subscribe_error_title"),
				description:
					err instanceof Error
						? err.message
						: t("store_admin_subscribe_error_generic"),
			});
		} finally {
			setFreeLoading(false);
		}
	};

	const runIntervalChange = async (targetInterval: "month" | "year") => {
		setIntervalLoading(true);
		try {
			const result = await changeStoreSubscriptionIntervalAction(storeId, {
				targetInterval,
			});
			if (result?.serverError) {
				toastError({
					title: t("store_admin_subscribe_error_title"),
					description: result.serverError,
				});
				return;
			}
			toastSuccess({
				description: t("store_admin_billing_interval_change_success"),
			});
			setMonthlyModalOpen(false);
			setYearlyModalOpen(false);
			router.refresh();
		} catch (err: unknown) {
			toastError({
				title: t("store_admin_subscribe_error_title"),
				description:
					err instanceof Error
						? err.message
						: t("store_admin_subscribe_error_generic"),
			});
		} finally {
			setIntervalLoading(false);
		}
	};

	const canChangeIntervalOnSubscribe =
		plan !== "free" &&
		Boolean(stripeSubscriptionId) &&
		storeSubscriptionStatus === SubscriptionStatus.Active &&
		(stripeBillingInterval === "month" || stripeBillingInterval === "year");

	const intervalLabel =
		billing === "month"
			? t("store_admin_subscribe_interval_month")
			: t("store_admin_subscribe_interval_year");

	return (
		<div className="flex flex-col gap-8">
			<AlertModal
				isOpen={freeModalOpen}
				onClose={() => setFreeModalOpen(false)}
				onConfirm={() => void onUnsubscribeFree()}
				loading={freeLoading}
				title={t("billing_downgrade_free_confirm_title")}
				description={t(
					stripeBillingInterval === "year"
						? "billing_downgrade_free_confirm_description_yearly"
						: "billing_downgrade_free_confirm_description_monthly",
				)}
			/>
			<AlertModal
				isOpen={monthlyModalOpen}
				onClose={() => setMonthlyModalOpen(false)}
				onConfirm={() => void runIntervalChange("month")}
				loading={intervalLoading}
				title={t("billing_downgrade_monthly_confirm_title")}
				description={t("billing_downgrade_monthly_confirm_description")}
			/>
			<AlertModal
				isOpen={yearlyModalOpen}
				onClose={() => setYearlyModalOpen(false)}
				onConfirm={() => void runIntervalChange("year")}
				loading={intervalLoading}
				title={t("billing_upgrade_yearly_confirm_title")}
				description={t("billing_upgrade_yearly_confirm_description")}
			/>

			{canChangeIntervalOnSubscribe ? (
				<Card className="border-border/80 bg-muted/20">
					<CardHeader className="space-y-1 pb-2">
						<CardTitle className="text-base">
							{t("store_admin_billing_interval_title")}
						</CardTitle>
						<CardDescription className="text-sm">
							{t("store_admin_billing_interval_descr")}
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-2 pt-0">
						{stripeBillingInterval === "year" ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="touch-manipulation"
								disabled={intervalLoading}
								onClick={() => setMonthlyModalOpen(true)}
							>
								{t("store_admin_billing_switch_to_monthly")}
							</Button>
						) : null}
						{stripeBillingInterval === "month" ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="touch-manipulation"
								disabled={intervalLoading}
								onClick={() => setYearlyModalOpen(true)}
							>
								{t("store_admin_billing_switch_to_yearly")}
							</Button>
						) : null}
						<Button variant="link" size="sm" className="h-auto p-0" asChild>
							<Link href={`/storeAdmin/${storeId}/billing`}>
								{t("store_admin_billing_nav")}
							</Link>
						</Button>
					</CardContent>
				</Card>
			) : null}

			<div className="flex flex-col items-center gap-3">
				<ToggleGroup
					type="single"
					value={billing}
					onValueChange={(v) => {
						if (v === "month" || v === "year") {
							setBilling(v);
							setPrep(null);
							setPrepareError(undefined);
						}
					}}
					variant="outline"
					className="w-full max-w-md"
				>
					<ToggleGroupItem value="month" className="flex-1 touch-manipulation">
						{t("store_subscribe_billing_monthly")}
					</ToggleGroupItem>
					<ToggleGroupItem value="year" className="flex-1 touch-manipulation">
						{t("store_subscribe_billing_yearly")}
					</ToggleGroupItem>
				</ToggleGroup>
				{billing === "year" && savingsPercent != null && savingsPercent > 0 ? (
					<Badge variant="secondary" className="font-normal">
						{t("store_subscribe_save_vs_monthly", { percent: savingsPercent })}
					</Badge>
				) : null}
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-[auto_1fr_auto] md:items-stretch md:gap-x-3 md:gap-y-0 lg:gap-x-4">
				<Card
					className={cn(
						"relative flex flex-col border-border/80 md:row-span-3 md:grid md:h-full md:grid-rows-subgrid md:gap-0",
						plan === "free" && "ring-2 ring-primary/30",
					)}
				>
					<CardHeader className="pb-2 pt-6">
						<CardTitle className="text-lg">
							{t("store_subscribe_plan_free_title")}
						</CardTitle>
						<CardDescription className="text-2xl font-semibold tracking-tight text-foreground">
							$0
						</CardDescription>
					</CardHeader>
					<CardContent className="flex max-md:flex-1 flex-col gap-2 text-sm md:min-h-0 md:pt-6">
						<ul className="space-y-2 text-muted-foreground">
							<li className="flex gap-2">
								<IconCheck className="mt-0.5 size-4 shrink-0 text-primary" />
								<span>{t("store_subscribe_feature_free_1")}</span>
							</li>
							<li className="flex gap-2">
								<IconCheck className="mt-0.5 size-4 shrink-0 text-primary" />
								<span>{t("store_subscribe_feature_free_2")}</span>
							</li>
							<li className="flex gap-2">
								<IconCheck className="mt-0.5 size-4 shrink-0 text-primary" />
								<span>{t("store_subscribe_feature_free_3")}</span>
							</li>
							<li className="flex gap-2">
								<IconCheck className="mt-0.5 size-4 shrink-0 text-primary" />
								<span>{t("store_subscribe_feature_free_4")}</span>
							</li>
						</ul>
					</CardContent>
					<CardFooter className="max-md:mt-auto md:pt-6">
						<Button
							type="button"
							variant={plan === "free" ? "secondary" : "outline"}
							className="h-11 w-full touch-manipulation sm:h-10"
							disabled={plan === "free"}
							onClick={() => {
								if (plan !== "free") setFreeModalOpen(true);
							}}
						>
							{plan === "free"
								? t("store_subscribe_current_plan")
								: t("store_subscribe_switch_to_free")}
						</Button>
					</CardFooter>
				</Card>

				<Card
					className={cn(
						"relative flex flex-col border-border/80 md:row-span-3 md:grid md:h-full md:grid-rows-subgrid md:gap-0",
						plan === "pro" && "ring-2 ring-primary/30",
					)}
				>
					<div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
						<Badge className="shadow-sm">
							{t("store_subscribe_recommended")}
						</Badge>
					</div>
					<CardHeader className="pb-2 pt-6">
						<CardTitle className="text-lg">
							{t("store_subscribe_plan_pro_title")}
						</CardTitle>
						<CardDescription
							className={
								billing === "year" && proDisplay?.unitAmount
									? "space-y-1"
									: undefined
							}
						>
							{billing === "year" && proDisplay?.unitAmount ? (
								<>
									<div>
										<span className="text-2xl font-semibold tracking-tight text-foreground">
											{formatYearlyEffectivePerMonth(proDisplay, localeTag)}
										</span>
										<span className="text-muted-foreground">
											{" "}
											/ {t("store_admin_subscribe_interval_month")}
										</span>
									</div>
									<div className="text-sm text-muted-foreground">
										{t("store_subscribe_yearly_total_line", {
											amount: formatSlotPrice(proDisplay, localeTag),
										})}
									</div>
									{proYearlyEstimated ? (
										<p className="text-xs text-muted-foreground">
											{t("store_subscribe_yearly_estimate_notice")}
										</p>
									) : null}
								</>
							) : (
								<>
									<span className="text-2xl font-semibold tracking-tight text-foreground">
										{formatSlotPrice(proDisplay, localeTag)}
									</span>
									{proDisplay ? (
										<span className="text-muted-foreground">
											{" "}
											/ {intervalLabel}
										</span>
									) : null}
								</>
							)}
						</CardDescription>
					</CardHeader>
					<CardContent className="flex max-md:flex-1 flex-col gap-2 text-sm md:min-h-0 md:pt-6">
						<ul className="space-y-2 text-muted-foreground">
							<li className="flex gap-2">
								<IconCheck className="mt-0.5 size-4 shrink-0 text-primary" />
								<span>{t("store_subscribe_feature_pro_1")}</span>
							</li>
							<li className="flex gap-2">
								<IconCheck className="mt-0.5 size-4 shrink-0 text-primary" />
								<span>{t("store_subscribe_feature_pro_2")}</span>
							</li>
							<li className="flex gap-2">
								<IconCheck className="mt-0.5 size-4 shrink-0 text-primary" />
								<span>{t("store_subscribe_feature_pro_3")}</span>
							</li>
							<li className="flex gap-2">
								<IconCheck className="mt-0.5 size-4 shrink-0 text-primary" />
								<span>{t("store_subscribe_feature_pro_4")}</span>
							</li>
						</ul>
					</CardContent>
					<CardFooter className="max-md:mt-auto md:pt-6">
						<Button
							type="button"
							className="h-11 w-full touch-manipulation sm:h-10"
							disabled={proFooterDisabled}
							onClick={() => {
								if (
									plan === "pro" &&
									!proIsCurrentCadence &&
									stripeBillingInterval
								) {
									if (billing === "month") {
										setMonthlyModalOpen(true);
									} else {
										setYearlyModalOpen(true);
									}
									return;
								}
								if (proCheckout) {
									void runPrepare(proCheckout.id);
								}
							}}
						>
							{plan === "pro" && proIsCurrentCadence
								? t("store_subscribe_current_plan")
								: plan === "pro" && !proIsCurrentCadence
									? billing === "month"
										? t("store_admin_billing_switch_to_monthly")
										: t("store_admin_billing_switch_to_yearly")
									: !proCheckout
										? proYearlyEstimated
											? t("store_subscribe_yearly_not_configured")
											: t("store_subscribe_unavailable")
										: t("store_subscribe_subscribe")}
						</Button>
					</CardFooter>
				</Card>

				<Card
					className={cn(
						"relative flex flex-col border-border/80 md:row-span-3 md:grid md:h-full md:grid-rows-subgrid md:gap-0",
						plan === "multi" && "ring-2 ring-primary/30",
					)}
				>
					<CardHeader className="pb-2 pt-6">
						<CardTitle className="text-lg">
							{t("store_subscribe_plan_multi_title")}
						</CardTitle>
						<CardDescription
							className={
								billing === "year" && multiDisplay?.unitAmount
									? "space-y-1"
									: undefined
							}
						>
							{billing === "year" && multiDisplay?.unitAmount ? (
								<>
									<div>
										<span className="text-2xl font-semibold tracking-tight text-foreground">
											{formatYearlyEffectivePerMonth(multiDisplay, localeTag)}
										</span>
										<span className="text-muted-foreground">
											{" "}
											/ {t("store_admin_subscribe_interval_month")}
										</span>
									</div>
									<div className="text-sm text-muted-foreground">
										{t("store_subscribe_yearly_total_line", {
											amount: formatSlotPrice(multiDisplay, localeTag),
										})}
									</div>
									{multiYearlyEstimated ? (
										<p className="text-xs text-muted-foreground">
											{t("store_subscribe_yearly_estimate_notice")}
										</p>
									) : null}
								</>
							) : (
								<>
									<span className="text-2xl font-semibold tracking-tight text-foreground">
										{formatSlotPrice(multiDisplay, localeTag)}
									</span>
									{multiDisplay ? (
										<span className="text-muted-foreground">
											{" "}
											/ {intervalLabel}
										</span>
									) : null}
								</>
							)}
						</CardDescription>
					</CardHeader>
					<CardContent className="flex max-md:flex-1 flex-col gap-2 text-sm md:min-h-0 md:pt-6">
						<ul className="space-y-2 text-muted-foreground">
							<li className="flex gap-2">
								<IconCheck className="mt-0.5 size-4 shrink-0 text-primary" />
								<span>{t("store_subscribe_feature_multi_1")}</span>
							</li>
							<li className="flex gap-2">
								<IconCheck className="mt-0.5 size-4 shrink-0 text-primary" />
								<span>{t("store_subscribe_feature_multi_2")}</span>
							</li>
							<li className="flex gap-2">
								<IconCheck className="mt-0.5 size-4 shrink-0 text-primary" />
								<span>{t("store_subscribe_feature_multi_3")}</span>
							</li>
							<li className="flex gap-2">
								<IconCheck className="mt-0.5 size-4 shrink-0 text-primary" />
								<span>{t("store_subscribe_feature_multi_4")}</span>
							</li>
						</ul>
					</CardContent>
					<CardFooter className="max-md:mt-auto md:pt-6">
						<Button
							type="button"
							className="h-11 w-full touch-manipulation sm:h-10"
							disabled={multiFooterDisabled}
							onClick={() => {
								if (
									plan === "multi" &&
									!multiIsCurrentCadence &&
									stripeBillingInterval
								) {
									if (billing === "month") {
										setMonthlyModalOpen(true);
									} else {
										setYearlyModalOpen(true);
									}
									return;
								}
								if (multiCheckout) {
									void runPrepare(multiCheckout.id);
								}
							}}
						>
							{plan === "multi" && multiIsCurrentCadence
								? t("store_subscribe_current_plan")
								: plan === "multi" && !multiIsCurrentCadence
									? billing === "month"
										? t("store_admin_billing_switch_to_monthly")
										: t("store_admin_billing_switch_to_yearly")
									: !multiCheckout
										? multiYearlyEstimated
											? t("store_subscribe_yearly_not_configured")
											: t("store_subscribe_unavailable")
										: t("store_subscribe_subscribe")}
						</Button>
					</CardFooter>
				</Card>
			</div>

			{prepareError ? (
				<p className="text-center text-sm text-destructive">{prepareError}</p>
			) : null}

			{prep ? (
				<>
					<Separator />
					<SubscribeCheckoutPanel
						key={prep.subscriptionPaymentId}
						storeId={storeId}
						subscriptionPaymentId={prep.subscriptionPaymentId}
						amount={prep.amount}
						currency={prep.currency}
						interval={prep.interval}
						productName={prep.productName}
					/>
				</>
			) : null}
		</div>
	);
}

function SubscribeCheckoutPanel({
	storeId,
	subscriptionPaymentId,
	amount,
	currency,
	interval,
	productName,
}: {
	storeId: string;
	subscriptionPaymentId: string;
	amount: number;
	currency: string;
	interval: string | null;
	productName: string | null;
}) {
	const [clientSecret, setClientSecret] = useState("");
	const [initError, setInitError] = useState<string | undefined>();

	useEffect(() => {
		let cancelled = false;
		const run = async () => {
			const result = await fetchStoreSubscriptionCheckoutClientSecret({
				storeId,
				subscriptionPaymentId,
			});
			if (cancelled) {
				return;
			}
			if (!result.ok) {
				setInitError(result.message ?? "Failed to start payment");
				return;
			}
			if (result.client_secret) {
				setClientSecret(result.client_secret);
			} else {
				setInitError("Missing payment session");
			}
		};
		void run();
		return () => {
			cancelled = true;
		};
	}, [subscriptionPaymentId, storeId]);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const stripeElementsLocale = appLngToStripeElementsLocale(lng);

	const { resolvedTheme } = useTheme();
	const appearance: Appearance = {
		theme: resolvedTheme === "light" ? "flat" : "night",
	};

	const options: StripeElementsOptions = {
		clientSecret,
		appearance,
		locale: stripeElementsLocale,
	};
	const stripePromise = getStripe();

	const currencyUpper = currency.toUpperCase();
	const localeTag = lng === "tw" ? "zh-TW" : "en-US";
	const intervalLabel =
		interval === "month"
			? t("store_admin_subscribe_interval_month")
			: interval === "year"
				? t("store_admin_subscribe_interval_year")
				: (interval ?? "");

	if (initError) {
		return (
			<Card className="border-destructive/50">
				<CardHeader>
					<CardTitle>{t("store_admin_subscribe_error_title")}</CardTitle>
					<CardDescription>{initError}</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card className="relative mx-auto w-full max-w-lg">
			<CardHeader>
				<CardTitle className="text-base">
					{productName ?? t("subscription_page_title")}
				</CardTitle>
				<CardDescription>
					{intervalLabel
						? `${formatInternalMinorForDisplay(currency, amount, localeTag)} / ${intervalLabel}`
						: formatInternalMinorForDisplay(currency, amount, localeTag)}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{clientSecret === "" || stripePromise === null ? (
					<div
						role="status"
						className="flex flex-col items-center justify-center gap-3 py-10"
						aria-busy="true"
					>
						<ClipLoader size={40} color="#3498db" />
						<span className="text-sm text-muted-foreground">
							{t("store_admin_subscribe_preparing")}
						</span>
					</div>
				) : (
					<Elements
						key={`${clientSecret}:${stripeElementsLocale}`}
						stripe={stripePromise}
						options={options}
					>
						<SubscribeStripeForm
							storeId={storeId}
							subscriptionPaymentId={subscriptionPaymentId}
							amount={amount}
							currencyUpper={currencyUpper}
							localeTag={localeTag}
						/>
					</Elements>
				)}
			</CardContent>
		</Card>
	);
}

function SubscribeStripeForm({
	storeId,
	subscriptionPaymentId,
	amount,
	currencyUpper,
	localeTag,
}: {
	storeId: string;
	subscriptionPaymentId: string;
	amount: number;
	currencyUpper: string;
	localeTag: string;
}) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const { t: tPay } = useTranslation(lng, "payment-stripe");

	const { data: session } = authClient.useSession();
	const sessionUser = session?.user as CustomSessionUser | undefined;
	const email = sessionUser?.email ?? "";
	const name = sessionUser?.name ?? "";

	const elements = useElements();
	const stripe = useStripe();
	const [errorMessage, setErrorMessage] = useState<string | undefined>();
	const [isProcessingPayment, setIsProcessingPayment] = useState(false);

	const confirmedUrl = `${getAbsoluteUrl()}/storeAdmin/${storeId}/subscribe/stripe/confirmed?subscriptionPaymentId=${encodeURIComponent(subscriptionPaymentId)}`;

	const clearError = () => {
		setErrorMessage(undefined);
	};

	const paymentHandler = async (e: React.SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!stripe || !elements) {
			return;
		}
		setIsProcessingPayment(true);
		try {
			const { error } = await stripe.confirmPayment({
				elements,
				confirmParams: {
					return_url: confirmedUrl,
				},
			});
			if (error) {
				setErrorMessage(error.message);
				logger.info("Stripe confirmPayment error", {
					metadata: { error: error.message },
					tags: ["payment", "stripe", "subscription"],
				});
			}
		} finally {
			setIsProcessingPayment(false);
		}
	};

	return (
		<div
			className="relative space-y-4"
			aria-busy={isProcessingPayment}
			aria-disabled={isProcessingPayment}
		>
			{isProcessingPayment && (
				<div
					role="status"
					className="absolute inset-0 z-100 flex cursor-wait select-none items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
					aria-live="polite"
				>
					<div className="flex flex-col items-center gap-3">
						<ClipLoader size={40} color="#3498db" />
						<span className="text-sm font-medium text-muted-foreground">
							{t("store_admin_subscribe_processing")}
						</span>
					</div>
				</div>
			)}
			<LinkAuthenticationElement
				id="link-authentication-element"
				onChange={() => {
					clearError();
				}}
				options={{ defaultValues: { email } }}
			/>
			<PaymentElement
				id="payment-element"
				onChange={() => {
					clearError();
				}}
				options={{
					defaultValues: {
						billingDetails: {
							email,
							name,
						},
					},
				}}
			/>
			<div className="text-sm text-muted-foreground">
				{tPay("payment_stripe_pay_amount")}{" "}
				{formatInternalMinorForDisplay(
					currencyUpper.toLowerCase(),
					amount,
					localeTag,
				)}
			</div>
			<form onSubmit={paymentHandler} className="mt-2">
				{errorMessage && (
					<div className="mb-2 rounded-md bg-destructive/15 p-2 text-sm text-destructive">
						{errorMessage}
					</div>
				)}
				<Button
					type="submit"
					disabled={isProcessingPayment}
					className="h-10 w-full touch-manipulation disabled:opacity-25 sm:h-9 sm:min-h-0"
				>
					{tPay("payment_stripe_form_pay_button")}
				</Button>
			</form>
		</div>
	);
}
