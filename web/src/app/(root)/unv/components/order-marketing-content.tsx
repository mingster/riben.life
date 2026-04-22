"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import {
	IconShoppingBag,
	IconChartBar,
	IconChefHat,
	IconCreditCard,
	IconCup,
	IconDeviceTablet,
	IconFlame,
	IconPackage,
	IconQrcode,
	IconStar,
	IconToolsKitchen2,
} from "@tabler/icons-react";
import Container from "@/components/ui/container";
import Link from "next/link";

const FEATURE_KEYS = [
	"qrcode",
	"payment",
	"inventory",
	"kitchen",
	"reports",
	"staff_order",
] as const;

const FEATURE_ICONS = [
	IconQrcode,
	IconCreditCard,
	IconPackage,
	IconChefHat,
	IconChartBar,
	IconDeviceTablet,
];

const USE_CASES = [
	{ key: "dine_in", Icon: IconToolsKitchen2 },
	{ key: "beverage", Icon: IconCup },
	{ key: "takeaway", Icon: IconShoppingBag },
	{ key: "hotpot", Icon: IconFlame },
	{ key: "fine_dining", Icon: IconStar },
] as const;

export function OrderMarketingBody() {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "marketing");

	return (
		<div className="relative overflow-hidden bg-background text-foreground">
			<div className="relative">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 bg-linear-to-b from-muted/30 via-background to-background"
				/>

				<Container className="relative min-h-0 pt-0">
					{/* Description */}
					<section
						id="description"
						className="scroll-mt-40 py-10 sm:py-14 md:py-16"
					>
						<div className="mx-auto max-w-7xl">
							<h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
								{t("order_marketing_description_heading")}
							</h2>
							<p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
								{t("order_marketing_description_body")}
							</p>
						</div>
					</section>

					{/* Features */}
					<section
						id="features"
						className="scroll-mt-28 py-10 sm:py-14 md:py-16"
					>
						<div className="mx-auto max-w-7xl">
							<h2 className="text-center text-xl font-semibold text-foreground sm:text-2xl">
								{t("order_marketing_features_heading")}
							</h2>
							<div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
								{FEATURE_KEYS.map((key, i) => {
									const Icon = FEATURE_ICONS[i];
									return (
										<div
											key={key}
											className="rounded-xl border border-border bg-card p-6 shadow-md"
										>
											<div className="flex items-center gap-3">
												<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
													<Icon className="h-5 w-5" />
												</div>
												<h3 className="text-lg font-semibold text-foreground">
													{t(`order_marketing_feature_${key}_title` as const)}
												</h3>
											</div>
											<p className="mt-3 text-sm leading-relaxed text-muted-foreground">
												{t(
													`order_marketing_feature_${key}_description` as const,
												)}
											</p>
										</div>
									);
								})}
							</div>
						</div>
					</section>

					{/* Use cases */}
					<section
						id="useCases"
						className="scroll-mt-40 py-10 sm:py-14 md:py-16"
					>
						<div className="mx-auto max-w-7xl">
							<h2 className="text-center text-xl font-semibold text-foreground sm:text-2xl">
								{t("order_marketing_use_cases_heading")}
							</h2>
							<p className="mt-3 text-center text-sm text-muted-foreground sm:text-base">
								{t("order_marketing_use_cases_subtitle")}
							</p>
							<div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
								{USE_CASES.map(({ key, Icon }) => (
									<div
										key={key}
										className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
									>
										<div
											aria-hidden
											className="pointer-events-none absolute inset-0 bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100"
										/>
										<div className="relative">
											<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
												<Icon className="h-6 w-6" />
											</div>
											<h3 className="mt-4 text-base font-semibold text-foreground">
												{t(`order_marketing_use_case_${key}_title` as const)}
											</h3>
											<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
												{t(`order_marketing_use_case_${key}_body` as const)}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>
					</section>

					{/* CTA */}
					<section className="py-10 sm:py-14 md:py-20">
						<div className="mx-auto max-w-7xl overflow-hidden rounded-4xl bg-muted/20 p-6 sm:p-10 lg:p-12">
							<div className="text-center">
								<h2 className="text-xl font-semibold text-foreground sm:text-2xl">
									{t("order_marketing_cta_heading")}
								</h2>
								<div className="mt-6">
									<Link
										href="/storeAdmin/"
										className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-base font-medium text-primary-foreground shadow-md hover:opacity-90 touch-manipulation"
									>
										{t("order_marketing_cta_button")}
									</Link>
								</div>
							</div>
						</div>
					</section>
				</Container>
			</div>
		</div>
	);
}
