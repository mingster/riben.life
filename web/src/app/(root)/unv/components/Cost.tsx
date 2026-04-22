"use client";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { IconCheck } from "@tabler/icons-react";
import Link from "next/link";
import { Caption } from "./common";

const PLANS = [
	{ id: "basic", recommended: false, featureCount: 6, href: "/storeAdmin/" },
	{ id: "advanced", recommended: true, featureCount: 7, href: "/storeAdmin/" },
	{ id: "multi", recommended: false, featureCount: 5, href: "/contact" },
] as const;

export function Cost({ className, ...props }: { className?: string }) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "marketing");

	return (
		<section
			id="cost"
			className="relative scroll-mt-28 py-16 sm:py-20 font-minimal"
		>
			{/* background beam */}
			<div className="absolute inset-x-0 top-0 z-20 flex justify-center overflow-hidden pointer-events-none">
				<div className="w-[108rem] flex-none flex justify-end">
					<picture>
						<source srcSet="/img/beams/docs@30.avif" type="image/avif" />
						<img
							src="/img/beams/docs@tinypng.png"
							alt=""
							className="w-[71.75rem] flex-none max-w-none dark:hidden"
							decoding="async"
						/>
					</picture>
					<picture>
						<source srcSet="/img/beams/docs-dark@30.avif" type="image/avif" />
						<img
							src="/img/beams/docs-dark@tinypng.png"
							alt=""
							className="w-[90rem] flex-none max-w-none hidden dark:block"
							decoding="async"
						/>
					</picture>
				</div>
			</div>

			<div className="relative px-3 sm:px-4 mx-auto max-w-7xl md:px-8">
				<div className="flex gap-2 mb-3">
					<Caption className="text-sky-500">
						{t("cost_section_caption")}
					</Caption>
				</div>
				<h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
					{t("cost_section_heading")}
				</h2>
				<p className="mt-3 text-sm text-muted-foreground sm:text-base max-w-xl">
					{t("cost_section_subtitle")}
				</p>

				<div className="mt-10 grid gap-6 sm:grid-cols-3">
					{PLANS.map((plan) => (
						<div
							key={plan.id}
							className={`relative flex flex-col rounded-2xl border p-6 sm:p-7 ${
								plan.recommended
									? "border-primary bg-primary/5 shadow-lg ring-1 ring-primary/20"
									: "border-border bg-card shadow-sm"
							}`}
						>
							{plan.recommended && (
								<span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
									{t(`cost_plan_${plan.id}_badge` as const)}
								</span>
							)}

							<div>
								<p className="text-sm font-medium text-muted-foreground">
									{t(`cost_plan_${plan.id}_name` as const)}
								</p>
								<div className="mt-2 flex items-baseline gap-1">
									<span className="text-3xl font-bold tracking-tight text-foreground">
										{t(`cost_plan_${plan.id}_price` as const)}
									</span>
									<span className="text-sm text-muted-foreground">
										{t(`cost_plan_${plan.id}_price_note` as const)}
									</span>
								</div>
								<p className="mt-2 text-sm text-muted-foreground">
									{t(`cost_plan_${plan.id}_tagline` as const)}
								</p>
							</div>

							<ul className="mt-6 flex flex-col gap-3 flex-1">
								{Array.from({ length: plan.featureCount }, (_, i) => i + 1).map(
									(n) => (
										<li key={n} className="flex items-start gap-2 text-sm">
											<IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
											<span className="text-foreground">
												{t(`cost_plan_${plan.id}_feature_${n}` as const)}
											</span>
										</li>
									),
								)}
							</ul>

							<Link
								href={plan.href}
								className={`mt-8 inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold touch-manipulation transition-colors ${
									plan.recommended
										? "bg-primary text-primary-foreground hover:bg-primary/90"
										: "border border-border bg-background text-foreground hover:bg-muted/60"
								}`}
							>
								{t(`cost_plan_${plan.id}_cta` as const)}
							</Link>
						</div>
					))}
				</div>

				<p className="mt-8 text-center text-xs text-muted-foreground">
					{t("cost_section_footer")}
				</p>
			</div>
		</section>
	);
}
