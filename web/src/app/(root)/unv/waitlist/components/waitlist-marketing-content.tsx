"use client";

import { useTranslation } from "@/app/i18n/client";
import Container from "@/components/ui/container";
import { useI18n } from "@/providers/i18n-provider";
import Link from "next/link";
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
			<div className="bg-background text-foreground">
				<section className="pt-12 pb-10 sm:pt-20 sm:pb-16 md:pt-28 md:pb-20">
					<Container>
						<div className="mx-auto max-w-3xl text-center">
							<span className="hash-span" id="top">
								&nbsp;
							</span>
							<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl text-foreground">
								{t("waitlist_marketing_hero_title")}
							</h1>
							<p className="mt-4 text-lg text-muted-foreground sm:text-xl">
								{t("waitlist_marketing_hero_tagline")}
							</p>
							<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
					</Container>
				</section>

				<section className="py-10 sm:py-14 md:py-16 border-t border-border">
					<Container>
						<h2 className="text-center text-xl font-semibold text-foreground sm:text-2xl mb-10 sm:mb-12">
							{t("waitlist_marketing_features_heading")}
						</h2>
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
					</Container>
				</section>

				<section className="py-10 sm:py-14 md:py-16 bg-muted/20 border-t border-border">
					<Container>
						<div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
							<div>
								<div className="flex items-center gap-2 mb-6">
									<IconUserHeart className="h-6 w-6 text-primary" />
									<h2 className="text-xl font-semibold text-foreground sm:text-2xl">
										{t("waitlist_marketing_customer_flow_heading")}
									</h2>
								</div>
								<ol className="space-y-6">
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
							<div>
								<div className="flex items-center gap-2 mb-6">
									<IconBuildingStore className="h-6 w-6 text-primary" />
									<h2 className="text-xl font-semibold text-foreground sm:text-2xl">
										{t("waitlist_marketing_merchant_flow_heading")}
									</h2>
								</div>
								<ol className="space-y-6">
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
					</Container>
				</section>

				<section className="py-10 sm:py-14 md:py-16 border-t border-border">
					<Container>
						<h2 className="text-center text-xl font-semibold text-foreground sm:text-2xl mb-8">
							{t("waitlist_marketing_compare_heading")}
						</h2>
						<div className="overflow-x-auto -mx-3 sm:mx-0">
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
					</Container>
				</section>

				<section className="py-10 sm:py-12 border-t border-border bg-muted/15">
					<Container>
						<div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-6 sm:p-8">
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
					</Container>
				</section>

				<section className="py-10 sm:py-14 md:py-20">
					<Container>
						<div className="mx-auto max-w-2xl rounded-2xl border border-border bg-muted/30 px-6 py-10 text-center sm:px-10 sm:py-14">
							<IconArmchair className="mx-auto h-10 w-10 text-primary mb-4" />
							<h2 className="text-xl font-semibold text-foreground sm:text-2xl">
								{t("waitlist_marketing_cta_heading")}
							</h2>
							<div className="mt-6">
								<Link
									href="/storeAdmin/"
									className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-base font-medium text-primary-foreground shadow-md hover:opacity-90 touch-manipulation"
								>
									{t("waitlist_marketing_cta_button")}
								</Link>
							</div>
						</div>
					</Container>
				</section>
			</div>
			<Footer />
		</>
	);
}
