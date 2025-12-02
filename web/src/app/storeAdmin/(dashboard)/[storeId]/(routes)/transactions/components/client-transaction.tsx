"use client";

import { useTranslation } from "@/app/i18n/client";
import Currency from "@/components/currency";
import { DataTable } from "@/components/dataTable";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from "@/components/ui/form";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { getUtcNow } from "@/utils/datetime-utils";
import { cn, highlight_css } from "@/utils/utils";
import type { StringNVType } from "@/types/enum";
import { OrderStatus } from "@/types/enum";
import { zodResolver } from "@hookform/resolvers/zod";
import { PopoverClose } from "@radix-ui/react-popover";
import { IconCalendar } from "@tabler/icons-react";
import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { TransactionColumn } from "../transaction-column";
import { createTransactionColumns } from "./columns";

const timeFilterSchema = z.object({
	filter: z.string().optional().default("f0"),
	filter1_is_in_the_last_of_days: z.coerce.number().optional().default(7),
	filter_date1: z.date().optional(),
	filter_date2: z.date().optional(),
});

type TimeFilterFormValues = z.infer<typeof timeFilterSchema>;

interface TransactionClientProps {
	serverData: TransactionColumn[];
}

const TimerFilterSelections: StringNVType[] = [
	{ value: "f0", label: "" },
	{ value: "f1", label: "is in the last" },
	{ value: "f2", label: "is equal to" },
	{ value: "f3", label: "is between" },
	{ value: "f4", label: "is on or after" },
	{ value: "f5", label: "is before or on" },
];

const sortTransactions = (items: TransactionColumn[]) =>
	[...items].sort(
		(a, b) =>
			new Date(b.updatedAtIso).getTime() - new Date(a.updatedAtIso).getTime(),
	);

export function TransactionClient({ serverData }: TransactionClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const columns = useMemo(() => createTransactionColumns(t), [t]);
	const statusKeys = useMemo(
		() =>
			Object.keys(OrderStatus)
				.filter((value) => !Number.isNaN(Number(value)))
				.map((value) => Number(value)),
		[],
	);

	const [data, setData] = useState<TransactionColumn[]>(() =>
		sortTransactions(serverData),
	);
	useEffect(() => {
		setData(sortTransactions(serverData));
	}, [serverData]);

	const [statusFilter, setStatusFilter] = useState<number>(0);
	const [timeFilter, setTimeFilter] = useState<TimeFilterFormValues>({
		filter: "f0",
		filter1_is_in_the_last_of_days: 7,
		filter_date1: undefined,
		filter_date2: undefined,
	});

	const statusFiltered = useMemo(() => {
		if (statusFilter === 0) {
			return data;
		}
		return data.filter((item) => item.orderStatus === statusFilter);
	}, [data, statusFilter]);

	const timeFiltered = useMemo(() => {
		if (timeFilter.filter === "f0") {
			return statusFiltered;
		}

		const dateFromIso = (iso?: string) => (iso ? new Date(iso) : undefined);

		if (timeFilter.filter === "f1") {
			const days = timeFilter.filter1_is_in_the_last_of_days ?? 0;
			const threshold = getUtcNow();
			threshold.setDate(threshold.getDate() - days);
			return statusFiltered.filter(
				(item) => dateFromIso(item.updatedAtIso)! >= threshold,
			);
		}

		if (timeFilter.filter === "f2" && timeFilter.filter_date1) {
			return statusFiltered.filter((item) => {
				const date = dateFromIso(item.updatedAtIso);
				if (!date) return false;
				return (
					format(date, "yyyy-MM-dd") ===
					format(timeFilter.filter_date1!, "yyyy-MM-dd")
				);
			});
		}

		if (
			timeFilter.filter === "f3" &&
			timeFilter.filter_date1 &&
			timeFilter.filter_date2
		) {
			const start = timeFilter.filter_date1;
			const end = timeFilter.filter_date2;
			return statusFiltered.filter((item) => {
				const date = dateFromIso(item.updatedAtIso);
				if (!date) return false;
				return date >= start && date <= end;
			});
		}

		if (timeFilter.filter === "f4" && timeFilter.filter_date1) {
			const start = timeFilter.filter_date1;
			return statusFiltered.filter((item) => {
				const date = dateFromIso(item.updatedAtIso);
				if (!date) return false;
				return date >= start;
			});
		}

		if (timeFilter.filter === "f5" && timeFilter.filter_date1) {
			const end = timeFilter.filter_date1;
			return statusFiltered.filter((item) => {
				const date = dateFromIso(item.updatedAtIso);
				if (!date) return false;
				return date <= end;
			});
		}

		return statusFiltered;
	}, [statusFiltered, timeFilter]);

	const total = useMemo(() => {
		const sum = timeFiltered.reduce((acc, item) => acc + item.amount, 0);
		const refunds = timeFiltered.reduce(
			(acc, item) => acc + item.refundAmount,
			0,
		);
		return sum - refunds;
	}, [timeFiltered]);

	const handleClearFilters = useCallback(() => {
		setStatusFilter(0);
		setTimeFilter({
			filter: "f0",
			filter1_is_in_the_last_of_days: 7,
			filter_date1: undefined,
			filter_date2: undefined,
		});
	}, []);

	return (
		<>
			<Heading
				title={t("store_orders")}
				badge={timeFiltered.length}
				description=""
			/>

			<div className="flex flex-wrap gap-2 pb-2">
				<Button
					className={cn("h-9", statusFilter === 0 && highlight_css)}
					variant="outline"
					onClick={() => setStatusFilter(0)}
				>
					{t("All")}
				</Button>
				{statusKeys.map((key) => (
					<Button
						key={key}
						className={cn("h-9", statusFilter === key && highlight_css)}
						variant="outline"
						onClick={() => setStatusFilter(key)}
					>
						{t(`OrderStatus_${OrderStatus[key]}`)}
					</Button>
				))}
			</div>

			<div className="flex flex-wrap items-center justify-between gap-2 pb-2">
				<div className="flex items-center gap-2">
					<FilterDateTime value={timeFilter} onChange={setTimeFilter} />
					<Currency value={total} />
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={handleClearFilters}>
						{t("clear_Filter")}
					</Button>
					<div className="flex gap-1 text-xs font-mono text-muted-foreground">
						{TimerFilterSelections.find(
							(item) => item.value === timeFilter.filter,
						)?.label ?? ""}
						{timeFilter.filter === "f1" &&
							` ${timeFilter.filter1_is_in_the_last_of_days ?? 0} ${t("days")}`}
						{["f2", "f4", "f5"].includes(timeFilter.filter ?? "") &&
						timeFilter.filter_date1
							? ` ${format(timeFilter.filter_date1, "yyyy-MM-dd")}`
							: ""}
						{timeFilter.filter === "f3" &&
							timeFilter.filter_date1 &&
							timeFilter.filter_date2 && (
								<>
									{" "}
									{format(timeFilter.filter_date1, "yyyy-MM-dd")} ~{" "}
									{format(timeFilter.filter_date2, "yyyy-MM-dd")}
								</>
							)}
					</div>
				</div>
			</div>

			<Separator />
			<DataTable<TransactionColumn, unknown>
				data={timeFiltered}
				columns={columns}
				searchKey="user"
			/>
		</>
	);
}

interface FilterDateTimeProps {
	value: TimeFilterFormValues;
	onChange: (value: TimeFilterFormValues) => void;
}

function FilterDateTime({ value, onChange }: FilterDateTimeProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");
	const [open, setOpen] = useState(false);

	const form = useForm<TimeFilterFormValues>({
		resolver: zodResolver(timeFilterSchema) as Resolver<TimeFilterFormValues>,
		defaultValues: value,
	});

	useEffect(() => {
		form.reset(value);
	}, [value, form]);

	const onSubmit = (data: TimeFilterFormValues) => {
		onChange(data);
		setOpen(false);
	};

	const filterValue = form.watch("filter");
	const popOverDate1Ref = useRef<HTMLButtonElement | null>(null);
	const popOverDate2Ref = useRef<HTMLButtonElement | null>(null);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className="justify-start text-left font-normal"
				>
					<IconCalendar className="mr-0 size-4" />
					<span>{t("Date_and_Time")}</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-auto space-y-3 p-3">
				<div className="text-sm text-muted-foreground">
					{t("DateTime_Filter_descr")}
				</div>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
						<FormField
							control={form.control}
							name="filter"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<Select
											value={field.value ?? "f0"}
											onValueChange={(newValue) => field.onChange(newValue)}
										>
											<SelectTrigger>
												<SelectValue placeholder="" />
											</SelectTrigger>
											<SelectContent position="popper">
												{TimerFilterSelections.map((item) => (
													<SelectItem key={item.value} value={item.value}>
														{t(`TimerFilterSelections_${item.value}`)}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{filterValue === "f1" && (
							<FormField
								control={form.control}
								name="filter1_is_in_the_last_of_days"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<Input
												type="number"
												className="font-mono"
												{...field}
												value={field.value ?? ""}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						{["f2", "f3", "f4", "f5"].includes(filterValue ?? "") && (
							<FormField
								control={form.control}
								name="filter_date1"
								render={({ field }) => (
									<FormItem className="flex flex-col space-y-2">
										<Popover>
											<PopoverTrigger asChild>
												<FormControl>
													<Button
														variant="outline"
														className={cn(
															"justify-start text-left font-normal",
															!field.value && "text-muted-foreground",
														)}
													>
														{field.value
															? format(field.value, "PPP")
															: t("Pick_a_date")}
														<IconCalendar className="ml-auto size-4 opacity-50" />
													</Button>
												</FormControl>
											</PopoverTrigger>
											<PopoverContent className="w-auto p-0" align="start">
												<PopoverClose ref={popOverDate1Ref} />
												<Calendar
													mode="single"
													selected={field.value}
													onSelect={(date) => {
														field.onChange(date);
														popOverDate1Ref.current?.click();
													}}
												/>
											</PopoverContent>
										</Popover>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						{filterValue === "f3" && (
							<FormField
								control={form.control}
								name="filter_date2"
								render={({ field }) => (
									<FormItem className="flex flex-col space-y-2">
										<Popover>
											<PopoverTrigger asChild>
												<FormControl>
													<Button
														variant="outline"
														className={cn(
															"justify-start text-left font-normal",
															!field.value && "text-muted-foreground",
														)}
													>
														{field.value
															? format(field.value, "PPP")
															: t("Pick_a_date")}
														<IconCalendar className="ml-auto size-4 opacity-50" />
													</Button>
												</FormControl>
											</PopoverTrigger>
											<PopoverContent className="w-auto p-0" align="start">
												<PopoverClose ref={popOverDate2Ref} />
												<Calendar
													mode="single"
													selected={field.value}
													onSelect={(date) => {
														field.onChange(date);
														popOverDate2Ref.current?.click();
													}}
												/>
											</PopoverContent>
										</Popover>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						<Button type="submit" className="w-full">
							{t("apply")}
						</Button>
					</form>
				</Form>
			</PopoverContent>
		</Popover>
	);
}
