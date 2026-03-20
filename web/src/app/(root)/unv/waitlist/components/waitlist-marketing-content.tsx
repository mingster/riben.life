"use client";

import { useTranslation } from "@/app/i18n/client";
import Container from "@/components/ui/container";
import { useI18n } from "@/providers/i18n-provider";
import Link from "next/link";
import TypewriterComponent from "typewriter-effect";
import { NavBar } from "../../components/Header";
import { Footer } from "../../components/Footer";
import {
	IconQrcode,
	IconUsers,
	IconWalk,
	IconLayoutDashboard,
	IconBell,
	IconArmchair,
	IconBrain,
} from "@tabler/icons-react";

const FEATURE_KEYS = [
	"smarter_realtime",
	"line_integration_no_app",
	"flexible_queue_wait",
	"party_size_seats",
	"line_notify_call",
	"cloud_admin_simple",
] as const;

const FEATURE_ICONS = [
	IconBrain,
	IconQrcode,
	IconWalk,
	IconUsers,
	IconBell,
	IconLayoutDashboard,
];

export function WaitlistMarketingContent() {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "marketing");

	return (
		<>
			<NavBar />
			<div className="relative overflow-hidden bg-background text-foreground">
				{/* Decorative layers
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 bg-linear-to-b from-muted/30 via-background to-background"
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay bg-[url('/img/noise.147fc0e.gif')] bg-repeat"
				/>
 */}
				{/* Hero — full-bleed video background (place waiting_line.mp4 in /public) */}
				<section className="relative isolate min-h-[420px] overflow-hidden sm:min-h-[480px] md:min-h-[520px]">
					<span className="hash-span absolute top-0" id="top">
						&nbsp;
					</span>
					<video
						aria-hidden
						className="absolute inset-0 h-full w-full object-cover"
						autoPlay
						muted
						loop
						playsInline
						preload="metadata"
					>
						<source src="/videos/waiting_line.mp4" type="video/mp4" />
					</video>
					<div
						aria-hidden
						className="absolute inset-0 bg-slate-900/55 dark:bg-slate-950/70"
					/>
					<div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-3 pt-16 pb-12 sm:px-4 sm:pt-20 sm:pb-16 lg:pt-24 xl:pt-28 xl:pb-20">
						<h1 className="w-full text-2xl font-extrabold tracking-tight text-center text-white px-2 sm:text-3xl lg:text-4xl xl:text-5xl drop-shadow-sm">
							<TypewriterComponent
								options={{
									strings: [
										t("waitlist_marketing_hero_typewriter_1"),
										t("waitlist_marketing_hero_typewriter_2"),
									],
									autoStart: true,
									loop: true,
								}}
							/>
						</h1>
						<p className="max-w-3xl mx-auto mt-4 sm:mt-6 text-base sm:text-lg text-center text-slate-100 px-3 sm:px-0">
							{t("waitlist_marketing_hero_tagline")}
						</p>
						<div className="flex justify-center mt-6 space-x-6 text-sm sm:mt-10 px-3 sm:px-0">
							<Link
								href="/storeAdmin/"
								className="flex items-center justify-center w-full h-12 px-6 font-semibold text-white rounded-lg bg-slate-900 hover:bg-slate-700 active:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 sm:w-auto dark:bg-sky-500 dark:highlight-white/20 dark:hover:bg-sky-400 dark:active:bg-sky-600 touch-manipulation"
							>
								{t("waitlist_marketing_hero_cta")}
							</Link>
						</div>
					</div>
				</section>

				<Container className="min-h-0 pt-0">
					{/* Feature block */}
					<section className="py-10 sm:py-14 md:py-16">
						<h2 className="text-center text-xl font-semibold text-foreground sm:text-2xl mb-10 sm:mb-12">
							{t("waitlist_marketing_features_heading")}
						</h2>
						<div className="mx-auto w-full">
							<div className="grid gap-8 sm:gap-10 sm:grid-cols-2 lg:grid-cols-3">
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
						</div>
					</section>

					{/* Customer flow */}
					<section className="py-10 sm:py-14 md:py-16">
						<h2 className="text-center text-xl font-semibold text-foreground sm:text-2xl mb-10 sm:mb-12">
							{t("waitlist_marketing_customer_flow_heading")}
						</h2>
						<div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1fr] lg:items-start pr-10">
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

							<div className="pl-10">
								<ol className="flex flex-col gap-6">
									{[1, 2, 3, 4].map((n) => {
										const stepDescription = t(
											`waitlist_marketing_customer_step_${n}_description` as const,
										);
										const hasDescription =
											typeof stepDescription === "string" &&
											stepDescription.trim().length > 0;
										return (
											<li key={n} className="flex gap-4">
												<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
													{n}
												</span>
												<div>
													<p className="font-medium text-foreground leading-relaxed">
														{t(
															`waitlist_marketing_customer_step_${n}_title` as const,
														)}
													</p>
													{hasDescription ? (
														<p className="mt-1 text-sm text-muted-foreground leading-relaxed">
															{stepDescription}
														</p>
													) : null}
												</div>
											</li>
										);
									})}
								</ol>
							</div>
						</div>
					</section>

					{/* Merchant flow */}
					<section className="py-10 sm:py-14 md:py-16 border-t border-border">
						<h2 className="text-center text-xl font-semibold text-foreground sm:text-2xl mb-10 sm:mb-12">
							{t("waitlist_marketing_merchant_flow_heading")}
						</h2>
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
								<ol className="flex flex-col gap-6">
									{[1, 2, 3, 4].map((n) => {
										const stepDescription = t(
											`waitlist_marketing_merchant_step_${n}_description` as const,
										);
										const hasDescription =
											typeof stepDescription === "string" &&
											stepDescription.trim().length > 0;
										return (
											<li key={n} className="flex gap-4">
												<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
													{n}
												</span>
												<div>
													<p className="font-medium text-foreground leading-relaxed">
														{t(
															`waitlist_marketing_merchant_step_${n}_title` as const,
														)}
													</p>
													{hasDescription ? (
														<p className="mt-1 text-sm text-muted-foreground leading-relaxed">
															{stepDescription}
														</p>
													) : null}
												</div>
											</li>
										);
									})}
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

					<Link
						href="/unv/rsvp"
						className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-card px-6 text-base font-medium text-foreground shadow-sm hover:bg-muted/50 touch-manipulation"
					>
						{t("waitlist_marketing_link_rsvp")}
					</Link>
				</Container>

				<Footer />
			</div>
		</>
	);
}
