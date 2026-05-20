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
import {
	IconBarbell,
	IconBell,
	IconBrandGoogle,
	IconBuilding,
	IconCalendar,
	IconCash,
	IconCheck,
	IconClock,
	IconCreditCard,
	IconLayoutGrid,
	IconMail,
	IconScissors,
	IconStethoscope,
	IconToolsKitchen2,
	IconX,
} from "@tabler/icons-react";

const FEATURE_KEYS = [
	"booking",
	"pricing",
	"notifications",
	"calendar",
	"integrations",
	"policies",
	"payment",
	"automation",
] as const;

const FEATURE_ICONS = [
	IconCalendar, // booking
	IconCash, // pricing
	IconBell, // notifications
	IconLayoutGrid, // calendar
	IconBrandGoogle, // integrations
	IconClock, // policies
	IconCreditCard, // payment
	IconMail, // automation
];

const USE_CASES = [
	{ key: "studio", Icon: IconBarbell },
	{ key: "venue", Icon: IconBuilding },
	{ key: "restaurant", Icon: IconToolsKitchen2 },
	{ key: "beauty", Icon: IconScissors },
	{ key: "clinic", Icon: IconStethoscope },
] as const;

const BOOST_SECTIONS = [
	{ key: "direct", image: "/img/altly/rsvp-features.png" },
	{ key: "social", image: "/img/altly/rsvp-hero.png" },
	{ key: "noshow", image: "/img/altly/rsvp-features.png" },
	{ key: "retention", image: "/img/altly/rsvp-hero.png" },
] as const;

const TIER_FEATURES = [
	{ key: "booking_online", basic: true, advanced: true, multi: true },
	{ key: "booking_phone", basic: true, advanced: true, multi: true },
	{ key: "booking_modes", basic: true, advanced: true, multi: true },
	{ key: "google_line", basic: true, advanced: true, multi: true },
	{ key: "notifications", basic: true, advanced: true, multi: true },
	{ key: "business_hours", basic: true, advanced: true, multi: true },
	{ key: "facility_schedule", basic: true, advanced: true, multi: true },
	{ key: "dynamic_pricing", basic: true, advanced: true, multi: true },
	{ key: "staff_pricing", basic: true, advanced: true, multi: true },
	{ key: "blacklist", basic: true, advanced: true, multi: true },
	{ key: "standby_waitlist", basic: true, advanced: true, multi: true },
	{ key: "line_app", basic: true, advanced: true, multi: true },
	{ key: "recurring_booking", basic: true, advanced: true, multi: true },
	{ key: "preorder", basic: true, advanced: true, multi: true },
	{ key: "checkin", basic: true, advanced: true, multi: true },
	{ key: "cancellation", basic: true, advanced: true, multi: true },
	{ key: "calendar_sync", basic: true, advanced: true, multi: true },
	{ key: "messaging", basic: true, advanced: true, multi: true },
	{ key: "unlimited_reservations", basic: false, advanced: true, multi: true },
	{ key: "data_import_export", basic: false, advanced: true, multi: true },
	{ key: "stats", basic: false, advanced: true, multi: true },
	{ key: "multi_venue", basic: false, advanced: false, multi: true },
] as const;

export function RsvpMarketingBody() {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "marketing");

	return (
		<div className="relative overflow-hidden bg-background text-foreground">
			<div className="relative">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 bg-linear-to-b from-muted/30 via-background to-background"
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay bg-[url('/img/noise.147fc0e.gif')] bg-repeat"
				/>

				<Container className="relative min-h-0 pt-0">
					<section
						id="description"
						className="scroll-mt-40 py-10 sm:py-14 md:py-16"
					>
						<div className="mx-auto max-w-7xl grid gap-8 sm:gap-10 sm:grid-cols-2">
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
					</section>

					<section id="boost" className="scroll-mt-28 py-10 sm:py-14 md:py-20">
						<div className="mx-auto max-w-7xl space-y-16 sm:space-y-24">
							{BOOST_SECTIONS.map(({ key, image }, i) => (
								<div
									key={key}
									className={`flex flex-col gap-10 lg:flex-row lg:items-center ${i % 2 === 1 ? "lg:flex-row-reverse" : ""}`}
								>
									<div className="flex-1">
										<span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
											{t(`rsvp_marketing_boost_${key}_badge` as const)}
										</span>
										<h3 className="mt-4 text-xl font-semibold text-foreground sm:text-2xl">
											{t(`rsvp_marketing_boost_${key}_title` as const)}
										</h3>
										<p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
											{t(`rsvp_marketing_boost_${key}_body` as const)}
										</p>
										<ul className="mt-5 space-y-2.5">
											{([1, 2, 3, 4] as const).map((n) => (
												<li key={n} className="flex items-start gap-2.5">
													<IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
													<span className="text-sm text-muted-foreground">
														{t(
															`rsvp_marketing_boost_${key}_bullet_${n}` as const,
														)}
													</span>
												</li>
											))}
										</ul>
									</div>
									<div className="relative flex-1 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
										<div
											aria-hidden
											className="pointer-events-none absolute -inset-6 bg-primary/5 blur-2xl"
										/>
										<img
											src={image}
											alt=""
											loading="lazy"
											decoding="async"
											className="relative w-full h-auto rounded-xl"
										/>
									</div>
								</div>
							))}
						</div>
					</section>

					<section
						id="features"
						className="scroll-mt-28 py-10 sm:py-14 md:py-20"
					>
						<div className="mx-auto max-w-7xl">
							<h2 className="text-center text-xl font-semibold text-foreground sm:text-2xl">
								{t("rsvp_marketing_features_table_heading")}
							</h2>
							<p className="mt-2 text-center text-sm text-muted-foreground mb-8 sm:mb-10">
								{t("rsvp_marketing_features_table_subtitle")}
							</p>
							<div className="overflow-x-auto -mx-3 sm:mx-0 rounded-xl border border-border">
								<Table className="min-w-[500px]">
									<TableHeader>
										<TableRow className="bg-muted/50 hover:bg-muted/50">
											<TableHead className="sticky left-0 z-10 bg-muted/50 min-w-[220px] pl-4 py-4 text-foreground font-semibold">
												{t("rsvp_marketing_features_table_col_feature")}
											</TableHead>
											<TableHead className="w-28 text-center py-4 text-sm font-semibold text-muted-foreground">
												{t("rsvp_marketing_tier_basic")}
											</TableHead>
											<TableHead className="w-28 text-center py-4 text-sm font-semibold text-primary">
												{t("rsvp_marketing_tier_advanced")}
											</TableHead>
											<TableHead className="w-28 text-center py-4 text-sm font-semibold text-muted-foreground">
												{t("rsvp_marketing_tier_multi")}
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{TIER_FEATURES.map(
											({ key, basic, advanced, multi }, index) => (
												<TableRow
													key={key}
													className={
														index % 2 === 0 ? "bg-muted/10" : "bg-background"
													}
												>
													<TableCell className="sticky left-0 z-10 bg-inherit pl-4 py-3 text-sm font-medium text-foreground">
														{t(`rsvp_marketing_tier_feat_${key}` as const)}
													</TableCell>
													<TableCell className="text-center py-3">
														{basic ? (
															<IconCheck className="mx-auto h-4 w-4 text-primary" />
														) : (
															<IconX className="mx-auto h-4 w-4 text-muted-foreground/30" />
														)}
													</TableCell>
													<TableCell className="text-center py-3 bg-primary/5">
														{advanced ? (
															<IconCheck className="mx-auto h-4 w-4 text-primary" />
														) : (
															<IconX className="mx-auto h-4 w-4 text-muted-foreground/30" />
														)}
													</TableCell>
													<TableCell className="text-center py-3">
														{multi ? (
															<IconCheck className="mx-auto h-4 w-4 text-primary" />
														) : (
															<IconX className="mx-auto h-4 w-4 text-muted-foreground/30" />
														)}
													</TableCell>
												</TableRow>
											),
										)}
									</TableBody>
								</Table>
							</div>
						</div>
					</section>

					<section
						id="useCases"
						className="scroll-mt-40 py-10 sm:py-14 md:py-20"
					>
						<div className="mx-auto max-w-7xl">
							<h2 className="text-center text-xl font-semibold text-foreground sm:text-2xl">
								{t("rsvp_marketing_use_cases_heading")}
							</h2>
							<p className="mt-3 text-center text-sm text-muted-foreground sm:text-base">
								{t("rsvp_marketing_use_cases_subtitle")}
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
												{t(`rsvp_marketing_use_case_${key}_title` as const)}
											</h3>
											<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
												{t(`rsvp_marketing_use_case_${key}_body` as const)}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>
					</section>

					<section className="py-10 sm:py-14 md:py-20">
						<div className="mx-auto max-w-7xl overflow-hidden rounded-4xl bg-muted/20 p-6 sm:p-10 lg:p-12">
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
			</div>
		</div>
	);
}
