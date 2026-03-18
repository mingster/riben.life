"use client";

import { useTranslation } from "@/app/i18n/client";
import Container from "@/components/ui/container";
import { useI18n } from "@/providers/i18n-provider";
import Link from "next/link";
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
			<div className="bg-background text-foreground">
				{/* Hero */}
				<section className="pt-12 pb-10 sm:pt-20 sm:pb-16 md:pt-28 md:pb-20">
					<Container>
						<div className="mx-auto max-w-3xl text-center">
							<span className="hash-span" id="top">
								&nbsp;
							</span>
							<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl text-foreground">
								{t("rsvp_marketing_hero_title")}
							</h1>
							<p className="mt-4 text-lg text-muted-foreground sm:text-xl">
								{t("rsvp_marketing_hero_tagline")}
							</p>
							<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
					</Container>
				</section>

				{/* Feature sections */}
				<section className="py-10 sm:py-14 md:py-20">
					<Container>
						<div className="grid gap-10 sm:gap-12 md:gap-16 sm:grid-cols-2 lg:grid-cols-3">
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
					</Container>
				</section>

				{/* CTA */}
				<section className="py-10 sm:py-14 md:py-20">
					<Container>
						<div className="mx-auto max-w-2xl rounded-2xl border border-border bg-muted/30 px-6 py-10 text-center sm:px-10 sm:py-14">
							<h2 className="text-xl font-semibold text-foreground sm:text-2xl">
								{t("rsvp_marketing_cta_heading")}
							</h2>
							<div className="mt-6">
								<Link
									href="/storeAdmin/"
									className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-base font-medium text-primary-foreground shadow-md hover:opacity-90"
								>
									{t("rsvp_marketing_cta_button")}
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
