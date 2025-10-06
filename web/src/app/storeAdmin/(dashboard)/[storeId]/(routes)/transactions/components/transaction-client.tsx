"use client";

import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n-provider";

import { Heading } from "@/components/ui/heading";
import { cn, highlight_css } from "@/utils/utils";
import { getUtcNow } from "@/utils/datetime-utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { DataTable } from "@/components/dataTable";
import { Calendar } from "@/components/ui/calendar";
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
import type { Store } from "@/types";
import { OrderStatus, type StringNVType } from "@/types/enum";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { type StoreOrderColumn, columns } from "./columns";

import Currency from "@/components/currency";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from "@/components/ui/form";
import { PopoverClose } from "@radix-ui/react-popover";
interface StoreOrderClientProps {
	store: Store;
	data: StoreOrderColumn[];
}

export const TransactionClient: React.FC<StoreOrderClientProps> = ({
	store,
	data,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	// orderStatus numeric key
	const keys = Object.keys(OrderStatus).filter((v) => !Number.isNaN(Number(v)));

	const [total, setTotal] = useState(0); //0 = all
	const [filterByStatus, setFilterByStatus] = useState(0); //0 = all
	let result = data;

	if (filterByStatus !== 0) {
		//console.log('filter', filterStatus);
		result = data.filter((d) => d.orderStatus === filterByStatus);
		//console.log('result', result.length);
	}

	const defaultTimeFilter = {
		filter: "",
		filter1_is_in_the_last_of_days: 1,
		filter_date1: getUtcNow(),
		filter_date2: getUtcNow(),
	} as TimeFilter;

	const [filterByTime, setFilterByTime] =
		useState<TimeFilter>(defaultTimeFilter);

	// implement time filter
	if (filterByTime) {
		console.log("filterByTime", filterByTime);

		if (filterByTime.filter === "f1") {
			// filter result that are greater than in_last_of_days
			const in_last_of_days = getUtcNow();

			in_last_of_days.setDate(
				in_last_of_days.getDate() - filterByTime.filter1_is_in_the_last_of_days,
			);
			//console.log('in_last_of_days', format(in_last_of_days, "yyyy-MM-dd"));

			result = result.filter((d) => {
				const date = new Date(d.updatedAt);

				return date >= in_last_of_days;
			});
		} else if (filterByTime.filter === "f2") {
			// filter result that are on the same day as filter_date1
			result = result.filter((d) => {
				return (
					format(d.updatedAt, "yyyy-MM-dd") ===
					format(filterByTime.filter_date1, "yyyy-MM-dd")
				);
			});
		} else if (filterByTime.filter === "f3") {
			// filter result that are between filter_date1 and filter_date1
			result = result.filter((d) => {
				const date = new Date(d.updatedAt);

				return (
					date >= filterByTime.filter_date1 && date <= filterByTime.filter_date2
				);
			});
		} else if (filterByTime.filter === "f4") {
			// filter result that are on or after filter_date1
			result = result.filter((d) => {
				const date = new Date(d.updatedAt);

				return date >= filterByTime.filter_date1;
			});
		} else if (filterByTime.filter === "f5") {
			// filter result that are before or on filter_date1
			result = result.filter((d) => {
				const date = new Date(d.updatedAt);

				return date <= filterByTime.filter_date1;
			});
		}
	}

	function clearFilter() {
		setFilterByTime(defaultTimeFilter);
	}

	useEffect(() => {
		// sum of order amount, minus refund amount
		let total = result.reduce((a, b) => a + b.amount, 0);
		const refunds = result.reduce((a, b) => a + b.refundAmount, 0);
		total = total - refunds;

		setTotal(total);
	}, [result]);

	return (
		<>
			<Heading title={t("Store_orders")} badge={result.length} description="" />
			<div className="flex gap-1 pb-2">
				{/* status filter*/}
				<Button
					className={cn("h-12", filterByStatus === 0 && highlight_css)}
					variant="outline"
					onClick={() => {
						setFilterByStatus(0);
					}}
				>
					ALL
				</Button>
				{keys.map((key) => (
					<Button
						key={key}
						className={cn(
							"h-12",
							filterByStatus === Number(key) && highlight_css,
						)}
						variant="outline"
						onClick={() => {
							setFilterByStatus(Number(key));
						}}
					>
						{t(`OrderStatus_${OrderStatus[Number(key)]}`)}
					</Button>
				))}
			</div>

			<div className="grid grid-cols-2 justify-between pb-2">
				<div className="flex gap-1 items-center">
					<FilterDateTime
						disabled={false}
						defaultValue={filterByTime}
						onValueChange={setFilterByTime}
					/>
					<Currency value={total} />
				</div>
				<div className="flex gap-1 items-center">
					<Button variant={"outline"} size={"sm"} onClick={clearFilter}>
						{t("Clear_Filter")}
					</Button>

					{/* render date filter descr */}
					<div className="flex gap-1 text-xs font-mono">
						{
							TimerFilterSelections.find((v) => v.value === filterByTime.filter)
								?.label
						}
						&nbsp;
						{filterByTime.filter === "f1" &&
							`${filterByTime.filter1_is_in_the_last_of_days} $t(days)`}
						{(filterByTime.filter === "f2" ||
							filterByTime.filter === "f4" ||
							filterByTime.filter === "f5") &&
							format(filterByTime.filter_date1, "yyyy-MM-dd")}
						{filterByTime.filter === "f3" &&
							`${format(filterByTime.filter_date1, "yyyy-MM-dd")} ~ ${format(filterByTime.filter_date2, "yyyy-MM-dd")}`}
					</div>
				</div>
			</div>
			<Separator />
			<DataTable searchKey="" columns={columns} data={result} />
		</>
	);
};

const TimerFilterSelections: StringNVType[] = [
	{
		value: "f0",
		label: "",
	},
	{
		value: "f1",
		label: "is in the last",
	},
	{
		value: "f2",
		label: "is equal to",
	},
	{
		value: "f3",
		label: "is between",
	},
	{
		value: "f4",
		label: "is on or after",
	},
	{
		value: "f5",
		label: "is before or on",
	},
];

export type TimeFilter = {
	filter: string;
	filter1_is_in_the_last_of_days: number;
	filter_date1: Date;
	filter_date2: Date;
};

type filterProps = {
	disabled: boolean;
	defaultValue: TimeFilter;
	onValueChange?: (newValue: TimeFilter) => void;
};

const formSchema = z.object({
	filter: z.string().optional().prefault(""),
	filter1_is_in_the_last_of_days: z.number().optional().prefault(1),
	filter_date1: z.date().optional(),
	filter_date2: z.date().optional(),
});
type formValues = z.infer<typeof formSchema>;

export const FilterDateTime = ({
	disabled,
	defaultValue,
	onValueChange, // pass back the new value to parent component
	...props
}: filterProps) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");
	const [loading, _setLoading] = useState(false);
	const [open, setOpen] = useState(false);

	const defaultValues = defaultValue
		? {
				...defaultValue,
			}
		: {};

	const [val, setVal] = useState<TimeFilter>(defaultValue);
	//console.log("val", JSON.stringify(val));

	const setFilerValue = useCallback(
		(filter: string) => {
			if (val === null) return;

			val.filter = filter;
			setVal(val);
			onValueChange?.(val);
		},
		[val, onValueChange],
	);

	// Replace null values with undefined
	const sanitizedDefaultValues = Object.fromEntries(
		Object.entries(defaultValues).map(([key, value]) => [
			key,
			value ?? undefined,
		]),
	);

	const form = useForm<formValues>({
		resolver: zodResolver(formSchema) as any,
		defaultValues: sanitizedDefaultValues,
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		watch,
		clearErrors,
	} = useForm<formValues>();

	const onSubmit = async (data: formValues) => {
		//if (val === null) return;

		const filter = {
			filter: data.filter,
			filter1_is_in_the_last_of_days: data.filter1_is_in_the_last_of_days,
			filter_date1: data.filter_date1,
			filter_date2: data.filter_date2,
		} as TimeFilter;

		setVal(filter);
		onValueChange?.(filter);
		setOpen(false);
		//console.log("onSubmit", JSON.stringify(filter));
	};

	useEffect(() => {
		setFilerValue(val.filter);
	}, [val.filter, setFilerValue]);

	const popOverDate1Ref = useRef<HTMLButtonElement | null>(null);
	const popOverDate2Ref = useRef<HTMLButtonElement | null>(null);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant={"outline"}
					className={cn("justify-start text-left font-normal")}
				>
					<CalendarIcon className="mr-0 size-4" />
					<span>{t("Date_and_Time")}</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="flex w-auto flex-col space-y-2 p-2"
			>
				<div className="text-sm text-muted-foreground">
					{t("DateTime_Filter_descr")}
				</div>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="w-full space-y-1"
					>
						<FormField
							control={form.control}
							name="filter"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<Select
											onValueChange={(v) => {
												field.onChange(v);
												setFilerValue(v);
											}}
											defaultValue={field.value}
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

						<div className="flex items-center">
							<div
								className={cn(
									"flex gap-1 text-sm items-center",
									val?.filter !== "f1" && "hidden",
								)}
							>
								<>
									<FormField
										control={form.control}
										name="filter1_is_in_the_last_of_days"
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<Input
														type="number"
														disabled={loading || form.formState.isSubmitting}
														className="font-mono"
														placeholder=""
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									{t("days")}
								</>
							</div>
							<div
								className={cn(
									"flex text-sm items-center",
									val?.filter === "f1" && "hidden",
								)}
							>
								<FormField
									control={form.control}
									name="filter_date1"
									render={({ field }) => (
										<FormItem className="flex flex-col p-3">
											<Popover>
												<PopoverTrigger asChild>
													<FormControl>
														<Button
															variant={"outline"}
															className={cn(
																"pl-3 text-left font-normal",
																!field.value && "text-muted-foreground",
															)}
														>
															{field.value ? (
																format(field.value, "PPP")
															) : (
																<span>{t("Pick_a_date")}</span>
															)}
															<CalendarIcon className="size-4 ml-auto opacity-50" />
														</Button>
													</FormControl>
												</PopoverTrigger>
												<PopoverContent className="w-auto p-0" align="start">
													<PopoverClose ref={popOverDate1Ref} />
													<Calendar
														mode="single"
														selected={field.value}
														onSelect={(e) => {
															field.onChange(e);
															popOverDate1Ref.current?.click(); // closes popover
														}}
														disabled={(date: Date) =>
															date < new Date("1970-01-01") &&
															date < new Date("3000-01-01")
														}
													/>
												</PopoverContent>
											</Popover>
										</FormItem>
									)}
								/>
							</div>
							<div
								className={cn(
									"flex text-sm items-center",
									val?.filter !== "f3" && "hidden",
								)}
							>
								and
								<FormField
									control={form.control}
									name="filter_date2"
									render={({ field }) => (
										<FormItem className="flex flex-col p-3">
											<Popover>
												<PopoverTrigger asChild>
													<FormControl>
														<Button
															variant={"outline"}
															className={cn(
																"pl-3 text-left font-normal",
																!field.value && "text-muted-foreground",
															)}
														>
															{field.value ? (
																format(field.value, "PPP")
															) : (
																<span>{t("Pick_a_date")}</span>
															)}
															<CalendarIcon className="size-4 ml-auto opacity-50" />
														</Button>
													</FormControl>
												</PopoverTrigger>
												<PopoverContent className="w-auto p-0" align="start">
													<PopoverClose ref={popOverDate2Ref} />
													<Calendar
														mode="single"
														selected={field.value}
														onSelect={(e) => {
															field.onChange(e);
															popOverDate2Ref.current?.click(); // closes popover
														}}
														disabled={(date: Date) =>
															date < new Date("1970-01-01") &&
															date < new Date("3000-01-01")
														}
													/>
												</PopoverContent>
											</Popover>
										</FormItem>
									)}
								/>
							</div>
						</div>

						<Button
							disabled={!form.formState.isValid}
							className="disabled:opacity-25 w-full"
							type="submit"
						>
							{t("Apply")}
						</Button>
					</form>
				</Form>
			</PopoverContent>
		</Popover>
	);
};
