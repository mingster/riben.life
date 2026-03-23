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
	IconCalendar,
	IconCash,
	IconBell,
	IconLayoutGrid,
	IconBrandGoogle,
	IconClock,
	IconCheck,
	IconX,
} from "@tabler/icons-react";
import { BigText, Paragraph, Caption } from "./common";

const FEATURE_KEYS = [
	"booking",
	"pricing",
	"notifications",
	"calendar",
	"integrations",
	"policies",
	"payment",
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

const features_rsvp = [
	{
		description:
			"線上訂位：確認客人訂位資訊後，直接取得排隊號碼，時時掌握店家排隊狀態。",
		basic: true,
		advanced: true,
		multi: true,
	},
	{
		description: "電話訂位：消費者來電訂位，店家端爲客人紀錄訂位資訊。",
		basic: true,
		advanced: true,
		multi: true,
	},
	{
		description: "預約訂餐：直接線上訂餐，減少雙方的時間壓力。",
		basic: true,
		advanced: true,
		multi: true,
	},
	{
		description: "檢視未帶位、已入座、過號的客人資訊，桌位狀況一目了然。",
		basic: false,
		advanced: true,
		multi: true,
	},
	{
		description: "自定營業時間，避免客戶空跑。",
		basic: true,
		advanced: true,
		multi: true,
	},
	{
		description:
			"整合Google 預訂服務，消費者透過 Google 搜尋／地圖即可完成線上訂位。",
		basic: true,
		advanced: true,
		multi: true,
	},
	{
		description: "Google日曆及Gmail用餐提醒通知。",
		basic: true,
		advanced: true,
		multi: true,
	},
];

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

					<section
						id="features"
						className="scroll-mt-28 py-10 sm:py-14 md:py-20"
					>
						<div className="mx-auto max-w-7xl">
							<h2 className="text-center text-xl font-semibold text-foreground sm:text-2xl mb-8 sm:mb-10">
								{t("rsvp_marketing_features_table_heading")}
							</h2>
							<div className="overflow-x-auto -mx-3 sm:mx-0 rounded-xl">
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

								<div className="overflow-x-auto -mx-3 sm:mx-0">
									<Table className="min-w-full">
										<TableHeader>
											<TableRow>
												<TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
													&nbsp;
												</TableHead>
												<TableHead className="w-[60px] text-xs sm:text-sm">
													基礎版
												</TableHead>
												<TableHead className="w-[60px] text-xs sm:text-sm">
													進階版
												</TableHead>
												<TableHead className="w-[60px] text-xs sm:text-sm">
													多店版
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{features_rsvp.map((feature, index) => (
												<TableRow
													key={feature.description}
													className={
														index % 2 === 0
															? "bg-slate-50 dark:bg-slate-800"
															: "bg-white dark:bg-slate-900"
													}
												>
													<TableCell className="sticky left-0 bg-inherit z-10 pl-2 sm:pl-3 py-2 sm:py-3 min-w-[200px]">
														{feature.description}
													</TableCell>
													<TableCell className="pl-2 sm:pl-3 py-2 sm:py-3">
														{feature.basic ? <IconCheck /> : <IconX />}
													</TableCell>
													<TableCell className="pl-2 sm:pl-3 py-2 sm:py-3">
														{feature.advanced ? <IconCheck /> : <IconX />}
													</TableCell>
													<TableCell className="pl-2 sm:pl-3 py-2 sm:py-3">
														{feature.multi ? <IconCheck /> : <IconX />}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</div>
						</div>
					</section>

					<section
						id="useCases"
						className="scroll-mt-40 py-10 sm:py-14 md:py-20"
					>
						useCases 教練/個人工作室 | 教室/場地租借 | 餐廳/包廂空間
						<div>
							<BigText>客戶預約座位</BigText>
							<Caption>適用場景：高需求的特定時段（如周末、假日）</Caption>
							<Paragraph>
								顧客在谷歌圖進入系統，選擇日期和時間進行預約。
							</Paragraph>
							<Paragraph>店家根據預約情況安排座位、人力和食材。</Paragraph>
						</div>
						<div>
							<BigText>客戶預約#2</BigText>
							<Caption>適用場景：一般日</Caption>
							<Paragraph>
								顧客出發前，進入系統檢視目前狀況，預先排隊取號。
							</Paragraph>
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
