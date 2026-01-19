"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import useSWR from "swr";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { MonthlyStats } from "@/actions/get-monthly-stats";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const fetcher = async (url: string): Promise<MonthlyStats[]> => {
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error("Failed to fetch monthly stats");
	}
	return res.json();
};

// Month abbreviation to i18n key mapping
const monthKeyMap: Record<string, string> = {
	Jan: "month_jan",
	Feb: "month_feb",
	Mar: "month_mar",
	Apr: "month_apr",
	May: "month_may",
	Jun: "month_jun",
	Jul: "month_jul",
	Aug: "month_aug",
	Sep: "month_sep",
	Oct: "month_oct",
	Nov: "month_nov",
	Dec: "month_dec",
};

export function ChartBarInteractive({ storeId }: { storeId: string }) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [activeYear, setActiveYear] = React.useState<string>(
		new Date().getFullYear().toString(),
	);

	const chartConfig = {
		revenue: {
			label: t("revenue"),
			color: "var(--chart-2)",
		},
		rsvpCount: {
			label: t("rsvp_count"),
			color: "var(--primary)",
		},
	} satisfies ChartConfig;

	const { data, isLoading } = useSWR<MonthlyStats[]>(
		`/api/storeAdmin/${storeId}/monthly-stats?year=${activeYear}`,
		fetcher,
	);

	// Transform data with localized month labels
	const chartData = React.useMemo(() => {
		if (!data) return [];
		return data.map((item) => {
			const monthKey = monthKeyMap[item.month];
			const monthLabel = monthKey ? t(monthKey) : item.month;
			return {
				...item,
				monthLabel: `${activeYear} ${monthLabel}`,
			};
		});
	}, [data, activeYear, t]);

	// Generate last 5 years for select
	const years = React.useMemo(() => {
		const currentYear = new Date().getFullYear();
		return Array.from({ length: 5 }, (_, i) =>
			(currentYear - i + 1).toString(),
		); // Current + next year + 3 past
	}, []);

	return (
		<div className="mt-0 p-2 sm:p-4 border rounded-lg bg-muted/30 ">
			<Card className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card">
				<CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
					<div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
						<CardTitle>{t("monthly_revenue_rsvps")}</CardTitle>
						<CardDescription>
							{t("monthly_revenue_rsvps_description", { year: activeYear })}
						</CardDescription>
					</div>
					<div className="flex">
						<div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-l sm:border-t-0 sm:px-8 sm:py-6">
							<Select value={activeYear} onValueChange={setActiveYear}>
								<SelectTrigger
									className="w-[160px] rounded-lg sm:ml-auto"
									aria-label={t("select_year")}
								>
									<SelectValue placeholder={t("select_year")} />
								</SelectTrigger>
								<SelectContent className="rounded-xl">
									{years.map((year) => (
										<SelectItem key={year} value={year} className="rounded-lg">
											{year}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardHeader>
				<CardContent className="px-2 sm:p-6">
					{isLoading ? (
						<div className="flex h-[250px] w-full items-center justify-center">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					) : (
						<ChartContainer
							config={chartConfig}
							className="aspect-auto h-[250px] w-full"
						>
							<BarChart
								accessibilityLayer
								data={chartData}
								margin={{
									left: 12,
									right: 12,
								}}
							>
								<CartesianGrid vertical={false} />
								<XAxis
									dataKey="monthLabel"
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									minTickGap={32}
									angle={-45}
									textAnchor="end"
									height={60}
								/>
								<YAxis
									yAxisId="left"
									orientation="left"
									stroke="var(--color-revenue)"
									tickLine={false}
									axisLine={false}
									tickFormatter={(value) => `$${value}`}
								/>
								<YAxis
									yAxisId="right"
									orientation="right"
									stroke="var(--color-rsvpCount)"
									tickLine={false}
									axisLine={false}
									tickFormatter={(value) => value.toString()}
								/>
								<ChartTooltip
									cursor={false}
									content={<ChartTooltipContent indicator="dot" />}
								/>
								<ChartLegend content={<ChartLegendContent />} />
								<Bar
									yAxisId="left"
									dataKey="revenue"
									fill="var(--color-revenue)"
									radius={[4, 4, 0, 0]}
									name={t("revenue")}
								/>
								<Bar
									yAxisId="right"
									dataKey="rsvpCount"
									fill="var(--color-rsvpCount)"
									radius={[4, 4, 0, 0]}
									name={t("rsvp_count")}
									fillOpacity={0.6}
								/>
							</BarChart>
						</ChartContainer>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
