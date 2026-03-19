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
	IconCalendar,
	IconCash,
	IconBell,
	IconLayoutGrid,
	IconBrandGoogle,
	IconClock,
} from "@tabler/icons-react";

const FEATURE_KEYS = [
	"booking",
	"pricing",
	"payment",
	"notifications",
	"calendar",
	"integrations",
	"policies",
] as const;

const FEATURE_ICONS = [
	IconCalendar,
	IconCash,
	IconCash,
	IconBell,
	IconLayoutGrid,
	IconBrandGoogle,
	IconClock,
];

export function RsvpMarketingContent() {
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
									{t("rsvp_marketing_hero_title")}
								</h1>
								<p className="mt-4 text-lg text-muted-foreground sm:text-xl">
									{t("rsvp_marketing_hero_tagline")}
								</p>
								<div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
									<Link
										href="/storeAdmin/"
										className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-base font-medium text-primary-foreground shadow-md hover:opacity-90 touch-manipulation"
									>
										{t("rsvp_marketing_hero_cta")}
									</Link>
									<Link
										href="/unv/waitlist"
										className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-card px-6 text-base font-medium text-foreground shadow-sm hover:bg-muted/50 touch-manipulation"
									>
										{t("rsvp_marketing_link_waitlist")}
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
										src="/img/altly/rsvp-hero.png"
										alt="RSVP illustration preview"
										loading="lazy"
										decoding="async"
										className="h-auto w-full"
									/>
								</div>
							</div>
						</div>
					</section>

					{/* Feature block */}
					<section className="py-10 sm:py-14 md:py-20">
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
												<h2 className="text-lg font-semibold text-foreground">
													{t(`rsvp_marketing_feature_${key}_title`)}
												</h2>
											</div>
											<p className="mt-3 text-sm text-muted-foreground leading-relaxed">
												{t(`rsvp_marketing_feature_${key}_description`)}
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
										src="/img/altly/rsvp-features.png"
										alt="RSVP features illustration"
										loading="lazy"
										decoding="async"
										className="w-full h-auto rounded-2xl"
									/>
								</div>
							</div>
						</div>
					</section>

					{/* Feature table */}
					<section className="py-10 sm:py-14 md:py-20 border-t border-border">
						<div className="mx-auto max-w-7xl">
							<h2 className="text-center text-xl font-semibold text-foreground sm:text-2xl mb-8 sm:mb-10">
								{t("rsvp_marketing_features_table_heading")}
							</h2>
							<div className="overflow-x-auto -mx-3 sm:mx-0 rounded-xl border border-border">
								<Table className="min-w-[560px]">
									<TableHeader>
										<TableRow>
											<TableHead className="sticky left-0 z-10 min-w-[200px] bg-background pl-3 sm:pl-4">
												{t("rsvp_marketing_features_table_col_feature")}
											</TableHead>
											<TableHead className="pr-3 sm:pr-4">
												{t("rsvp_marketing_features_table_col_details")}
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
													{t(`rsvp_marketing_feature_${key}_title`)}
												</TableCell>
												<TableCell className="pr-3 sm:pr-4 py-3 sm:py-4 text-sm text-muted-foreground leading-relaxed">
													{t(`rsvp_marketing_feature_${key}_description`)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</div>
					</section>

					{/* CTA */}
					<section className="py-10 sm:py-14 md:py-20">
						<div className="mx-auto max-w-7xl overflow-hidden rounded-4xl border border-border bg-muted/20 p-6 sm:p-10 lg:p-12">
							<div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
								<div className="text-center lg:text-left">
									<h2 className="text-xl font-semibold text-foreground sm:text-2xl">
										{t("rsvp_marketing_cta_heading")}
									</h2>
									<div className="mt-6">
										<Link
											href="/storeAdmin/"
											className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-base font-medium text-primary-foreground shadow-md hover:opacity-90 touch-manipulation"
										>
											{t("rsvp_marketing_cta_button")}
										</Link>
									</div>
								</div>
								<div className="relative">
									<div
										aria-hidden
										className="pointer-events-none absolute -inset-4 rounded-4xl bg-primary/10 blur-2xl"
									/>
									<div className="relative overflow-hidden rounded-4xl border border-border bg-card">
										<img
											src="/img/altly/rsvp-cta.png"
											alt="RSVP call to action illustration"
											loading="lazy"
											decoding="async"
											className="w-full h-auto"
										/>
									</div>
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
