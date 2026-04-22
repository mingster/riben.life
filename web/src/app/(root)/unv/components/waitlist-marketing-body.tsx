"use client";

import { useTranslation } from "@/app/i18n/client";
import Container from "@/components/ui/container";
import { useI18n } from "@/providers/i18n-provider";
import Link from "next/link";
import {
	IconArmchair,
	IconBell,
	IconBrain,
	IconBuilding,
	IconCalendarEvent,
	IconLayoutDashboard,
	IconQrcode,
	IconStethoscope,
	IconToolsKitchen2,
	IconUsers,
	IconWalk,
} from "@tabler/icons-react";

import { useMarketingSystem } from "./marketing-system-context";

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

const USE_CASES = [
	{ key: "restaurant", Icon: IconToolsKitchen2 },
	{ key: "clinic", Icon: IconStethoscope },
	{ key: "gov", Icon: IconBuilding },
	{ key: "event", Icon: IconCalendarEvent },
] as const;

export function WaitlistMarketingBody() {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "marketing");
	const { setActiveSystem } = useMarketingSystem();

	return (
		<div className="relative overflow-hidden bg-background text-foreground">
			<Container className="min-h-0 pt-0">
				<section
					id="description"
					className="scroll-mt-40 py-10 sm:py-14 md:py-16"
				>
					<h2 className="text-center text-xl font-semibold text-foreground sm:text-2xl mb-10 sm:mb-12">
						{t("waitlist_marketing_features_heading")}
					</h2>
					{/* Scroll target for shared #features nav (roadmap block removed). */}
					<div
						id="features"
						className="h-0 scroll-mt-28 overflow-hidden"
						aria-hidden
					/>
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

				<section id="useCases" className="scroll-mt-40 py-10 sm:py-14 md:py-16">
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

				<section className="py-10 sm:py-14 md:py-16">
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

				<section id="useCases" className="scroll-mt-40 py-10 sm:py-14 md:py-16">
					<div className="mx-auto max-w-7xl">
						<h2 className="text-center text-xl font-semibold text-foreground sm:text-2xl">
							{t("waitlist_marketing_use_cases_heading")}
						</h2>
						<p className="mt-3 text-center text-sm text-muted-foreground sm:text-base">
							{t("waitlist_marketing_use_cases_subtitle")}
						</p>
						<div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
											{t(`waitlist_marketing_use_case_${key}_title` as const)}
										</h3>
										<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
											{t(`waitlist_marketing_use_case_${key}_body` as const)}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</section>

				<section className="py-10 sm:py-14 md:py-16">
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
		</div>
	);
}
