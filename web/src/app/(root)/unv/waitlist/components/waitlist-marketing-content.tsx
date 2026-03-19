"use client";

import { useTranslation } from "@/app/i18n/client";
import Container from "@/components/ui/container";
import { useI18n } from "@/providers/i18n-provider";
import Link from "next/link";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { NavBar } from "../../components/Header";
import { Footer } from "../../components/Footer";
import {
	IconQrcode,
	IconUsers,
	IconShieldLock,
	IconWalk,
	IconLayoutDashboard,
	IconDeviceMobile,
	IconUserHeart,
	IconBuildingStore,
	IconBell,
	IconArmchair,
} from "@tabler/icons-react";

const FEATURE_KEYS = [
	"qr_web",
	"party_size",
	"verification_code",
	"wait_away",
	"staff_console",
	"optional_contact",
] as const;

const FEATURE_ICONS = [
	IconQrcode,
	IconUsers,
	IconShieldLock,
	IconWalk,
	IconLayoutDashboard,
	IconDeviceMobile,
];

export function WaitlistMarketingContent() {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "marketing");

	return (
		<>
			<NavBar />
			<div className="relative overflow-hidden bg-background text-foreground">
				{/* Decorative layers */}
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 bg-linear-to-b from-muted/30 via-background to-background"
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay bg-[url('/img/noise.147fc0e.gif')] bg-repeat"
				/>

				<Container className="min-h-0 pt-0">
					{/* Hero */}
					<section className="pt-12 pb-10 sm:pt-20 sm:pb-16 md:pt-28 md:pb-20">
						<div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
							<div className="text-center lg:text-left">
								<span className="hash-span" id="top">
									&nbsp;
								</span>
								<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl text-foreground">
									{t("waitlist_marketing_hero_title")}
								</h1>
								<p className="mt-4 text-lg text-muted-foreground sm:text-xl">
									{t("waitlist_marketing_hero_tagline")}
								</p>
								<div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
									<Link
										href="/storeAdmin/"
										className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-base font-medium text-primary-foreground shadow-md hover:opacity-90 touch-manipulation"
									>
										{t("waitlist_marketing_hero_cta")}
									</Link>
									<Link
										href="/unv/rsvp"
										className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-card px-6 text-base font-medium text-foreground shadow-sm hover:bg-muted/50 touch-manipulation"
									>
										{t("waitlist_marketing_link_rsvp")}
									</Link>
								</div>
							</div>

							<div className="relative">
								<div
									aria-hidden
									className="pointer-events-none absolute -inset-3 rounded-4xl bg-primary/20 blur-2xl"
								/>
								<div className="relative overflow-hidden rounded-4xl border border-border bg-card shadow-md">
									<img
										src="/img/altly/waitlist-hero.png"
										alt="Waitlist illustration preview"
										loading="lazy"
										decoding="async"
										className="h-auto w-full"
									/>
								</div>
							</div>
						</div>
					</section>

					{/* Feature block */}
					<section className="py-10 sm:py-14 md:py-16">
						<h2 className="text-center text-xl font-semibold text-foreground sm:text-2xl mb-10 sm:mb-12">
							{t("waitlist_marketing_features_heading")}
						</h2>
						<div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-start">
							<div className="grid gap-8 sm:gap-10 sm:grid-cols-2">
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
													{t(`waitlist_marketing_feature_${key}_title`)}
												</h3>
											</div>
											<p className="mt-3 text-sm text-muted-foreground leading-relaxed">
												{t(`waitlist_marketing_feature_${key}_description`)}
											</p>
										</div>
									);
								})}
							</div>

							<div className="relative overflow-hidden rounded-4xl border border-border bg-card p-4 sm:p-6 shadow-sm">
								<div
									aria-hidden
									className="pointer-events-none absolute -inset-10 bg-primary/10 blur-2xl"
								/>
								<div className="relative">
									<img
										src="/img/altly/waitlist-features.png"
										alt="Waitlist features illustration"
										loading="lazy"
										decoding="async"
										className="w-full h-auto rounded-2xl"
									/>
								</div>
							</div>
						</div>
					</section>

					{/* Feature table */}
					<section className="py-10 sm:py-14 md:py-16 border-t border-border">
						<div className="mx-auto max-w-7xl">
							<h2 className="text-center text-xl font-semibold text-foreground sm:text-2xl mb-8 sm:mb-10">
								{t("waitlist_marketing_features_table_heading")}
							</h2>
							<div className="overflow-x-auto -mx-3 sm:mx-0 rounded-xl border border-border">
								<Table className="min-w-[560px]">
									<TableHeader>
										<TableRow>
											<TableHead className="sticky left-0 z-10 min-w-[200px] bg-background pl-3 sm:pl-4">
												{t("waitlist_marketing_features_table_col_feature")}
											</TableHead>
											<TableHead className="pr-3 sm:pr-4">
												{t("waitlist_marketing_features_table_col_details")}
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{FEATURE_KEYS.map((key, index) => (
											<TableRow
												key={key}
												className={
													index % 2 === 0 ? "bg-muted/25" : "bg-background"
												}
											>
												<TableCell className="sticky left-0 z-10 bg-inherit pl-3 sm:pl-4 py-3 sm:py-4 font-medium text-foreground">
													{t(`waitlist_marketing_feature_${key}_title`)}
												</TableCell>
												<TableCell className="pr-3 sm:pr-4 py-3 sm:py-4 text-sm text-muted-foreground leading-relaxed">
													{t(`waitlist_marketing_feature_${key}_description`)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</div>
					</section>

					{/* Customer flow */}
					<section className="py-10 sm:py-14 md:py-16 bg-muted/20 border-t border-border">
						<div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1fr] lg:items-start">
							<div className="lg:order-2">
								<div className="relative overflow-hidden rounded-4xl border border-border bg-card">
									<img
										src="/img/altly/waitlist-customer-flow.png"
										alt="Waitlist customer flow illustration"
										loading="lazy"
										decoding="async"
										className="w-full h-auto"
									/>
								</div>
							</div>

							<div>
								<div className="flex items-center gap-2 mb-6">
									<IconUserHeart className="h-6 w-6 text-primary" />
									<h2 className="text-xl font-semibold text-foreground sm:text-2xl">
										{t("waitlist_marketing_customer_flow_heading")}
									</h2>
								</div>
								<ol className="flex flex-col gap-6">
									{[1, 2, 3, 4].map((n) => (
										<li key={n} className="flex gap-4">
											<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
												{n}
											</span>
											<div>
												<p className="font-medium text-foreground">
													{t(
														`waitlist_marketing_customer_step_${n}_title` as const,
													)}
												</p>
												<p className="mt-1 text-sm text-muted-foreground leading-relaxed">
													{t(
														`waitlist_marketing_customer_step_${n}_description` as const,
													)}
												</p>
											</div>
										</li>
									))}
								</ol>
							</div>
						</div>
					</section>

					{/* Merchant flow */}
					<section className="py-10 sm:py-14 md:py-16 border-t border-border">
						<div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-start">
							<div className="relative overflow-hidden rounded-4xl border border-border bg-card">
								<img
									src="/img/altly/waitlist-merchant-flow.png"
									alt="Waitlist merchant flow illustration"
									loading="lazy"
									decoding="async"
									className="w-full h-auto"
								/>
							</div>
							<div>
								<div className="flex items-center gap-2 mb-6">
									<IconBuildingStore className="h-6 w-6 text-primary" />
									<h2 className="text-xl font-semibold text-foreground sm:text-2xl">
										{t("waitlist_marketing_merchant_flow_heading")}
									</h2>
								</div>
								<ol className="flex flex-col gap-6">
									{[1, 2, 3, 4].map((n) => (
										<li key={n} className="flex gap-4">
											<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
												{n}
											</span>
											<div>
												<p className="font-medium text-foreground">
													{t(
														`waitlist_marketing_merchant_step_${n}_title` as const,
													)}
												</p>
												<p className="mt-1 text-sm text-muted-foreground leading-relaxed">
													{t(
														`waitlist_marketing_merchant_step_${n}_description` as const,
													)}
												</p>
											</div>
										</li>
									))}
								</ol>
							</div>
						</div>
					</section>

					{/* Comparison */}
					<section className="py-10 sm:py-14 md:py-16 border-t border-border">
						<h2 className="text-center text-xl font-semibold text-foreground sm:text-2xl mb-8">
							{t("waitlist_marketing_compare_heading")}
						</h2>

						<div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1fr] lg:items-start">
							<div className="relative overflow-hidden rounded-4xl border border-border bg-card">
								<img
									src="/img/altly/waitlist-compare.png"
									alt="Waitlist comparison illustration"
									loading="lazy"
									decoding="async"
									className="w-full h-auto"
								/>
							</div>

							<div className="overflow-x-auto">
								<table className="w-full min-w-[520px] text-sm border-collapse">
									<thead>
										<tr className="border-b border-border">
											<th className="py-3 px-2 text-left font-medium text-muted-foreground w-[28%]" />
											<th className="py-3 px-2 text-center font-medium text-foreground">
												{t("waitlist_marketing_compare_col_paper")}
											</th>
											<th className="py-3 px-2 text-center font-medium text-foreground">
												{t("waitlist_marketing_compare_col_hardware")}
											</th>
											<th className="py-3 px-2 text-center font-medium text-primary">
												{t("waitlist_marketing_compare_col_riben")}
											</th>
										</tr>
									</thead>
									<tbody>
										{(
											["experience", "efficiency", "notify", "cost"] as const
										).map((row) => (
											<tr key={row} className="border-b border-border/80">
												<td className="py-3 px-2 font-medium text-foreground">
													{t(`waitlist_marketing_compare_row_${row}_label`)}
												</td>
												<td className="py-3 px-2 text-center text-muted-foreground">
													{t(`waitlist_marketing_compare_row_${row}_paper`)}
												</td>
												<td className="py-3 px-2 text-center text-muted-foreground">
													{t(`waitlist_marketing_compare_row_${row}_hardware`)}
												</td>
												<td className="py-3 px-2 text-center text-foreground font-medium">
													{t(`waitlist_marketing_compare_row_${row}_riben`)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</section>

					{/* Roadmap */}
					<section className="py-10 sm:py-12 md:py-16 border-t border-border bg-muted/15">
						<div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-center">
							<div className="relative overflow-hidden rounded-4xl border border-border bg-card">
								<img
									src="/img/altly/waitlist-roadmap.png"
									alt="Waitlist roadmap illustration"
									loading="lazy"
									decoding="async"
									className="w-full h-auto"
								/>
							</div>
							<div>
								<div className="flex items-start gap-3">
									<IconBell className="h-5 w-5 shrink-0 text-primary mt-0.5" />
									<div>
										<h2 className="text-lg font-semibold text-foreground">
											{t("waitlist_marketing_roadmap_heading")}
										</h2>
										<p className="mt-2 text-sm text-muted-foreground leading-relaxed">
											{t("waitlist_marketing_roadmap_body")}
										</p>
									</div>
								</div>
							</div>
						</div>
					</section>

					{/* CTA */}
					<section className="py-10 sm:py-14 md:py-20">
						<div className="mx-auto max-w-7xl overflow-hidden rounded-4xl border border-border bg-muted/30">
							<div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_1fr] lg:items-center">
								<div className="text-center lg:text-left">
									<IconArmchair className="mx-auto lg:mx-0 h-10 w-10 text-primary mb-4" />
									<h2 className="text-xl font-semibold text-foreground sm:text-2xl">
										{t("waitlist_marketing_cta_heading")}
									</h2>
									<div className="mt-6 flex items-center justify-center lg:justify-start">
										<Link
											href="/storeAdmin/"
											className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-base font-medium text-primary-foreground shadow-md hover:opacity-90 touch-manipulation"
										>
											{t("waitlist_marketing_cta_button")}
										</Link>
									</div>
								</div>
								<div className="relative overflow-hidden rounded-4xl border border-border bg-card">
									<img
										src="/img/altly/waitlist-cta.png"
										alt="Waitlist CTA illustration"
										loading="lazy"
										decoding="async"
										className="w-full h-auto"
									/>
								</div>
							</div>
						</div>
					</section>
				</Container>

				<Footer />
			</div>
		</>
	);
}
