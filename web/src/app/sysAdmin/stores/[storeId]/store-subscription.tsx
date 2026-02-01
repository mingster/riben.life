"use client";
import { Loader } from "@/components/loader";
import { toastError, toastSuccess } from "@/components/toaster";
import { cn } from "@/utils/utils";
import { formatDateTime, epochToDate } from "@/utils/datetime-utils";
import { zodResolver } from "@hookform/resolvers/zod";

import { useTranslation } from "@/app/i18n/client";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/providers/i18n-provider";
import { StoreLevel, SubscriptionStatus } from "@/types/enum";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import type { Store, StoreSubscription } from "@prisma/client";
import { updateStoreSubscriptionAction } from "@/actions/sysAdmin/store/update-store-subscription";
import { cancelStoreSubscriptionAction } from "@/actions/sysAdmin/store/cancel-store-subscription";

import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import logger from "@/lib/logger";

import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { IconCalendar } from "@tabler/icons-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
	subscriptionId: z.string().optional().nullable(),
	expiration: z.date().optional().nullable(),
	note: z.string().optional().nullable(),
	level: z.number(),
});

type formValues = z.infer<typeof formSchema>;

export interface SettingsFormProps {
	initialData: Store;
	subscription: StoreSubscription | null;
}

// allow admin user to view/cancel store subscription. Also allow admin user to update store level.
export const StoreSubscrptionTab: React.FC<SettingsFormProps> = ({
	initialData,
	subscription,
}) => {
	const params = useParams();
	const router = useRouter();

	//const origin = useOrigin();
	const [loading, setLoading] = useState(false);

	// to avoid input component error
	if (subscription && subscription.subscriptionId === null) {
		subscription.subscriptionId = "";
		//console.log("subscriptionId", subscription.subscriptionId);
	}

	const defaultValues: formValues = {
		level: initialData?.level ?? StoreLevel.Free,
		subscriptionId: subscription?.subscriptionId ?? "",
		note: subscription?.note ?? "",
		expiration: subscription?.expiration
			? epochToDate(BigInt(subscription.expiration))
			: undefined,
	};

	const form = useForm<formValues>({
		resolver: zodResolver(formSchema),
		defaultValues,
	});
	const { clearErrors } = form;

	const levelOptions = [
		{ value: String(StoreLevel.Free), label: "Free" },
		{ value: String(StoreLevel.Pro), label: "Pro" },
		{ value: String(StoreLevel.Multi), label: "Multi" },
	];

	//const isSubmittable = !!form.formState.isDirty && !!form.formState.isValid;

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const onSubmit = async (data: formValues) => {
		logger.info("Admin update subscription");

		setLoading(true);
		try {
			const result = await updateStoreSubscriptionAction({
				storeId: String(params.storeId),
				level: Number(data.level),
				subscriptionId: data.subscriptionId || null,
				note: data.note ?? "",
				expiration: data.expiration ?? undefined,
			});

			if (result?.serverError) {
				toastError({
					title: "Error",
					description: result.serverError,
				});
				return;
			}

			toastSuccess({
				title: "Subscription updated.",
				description: "",
			});
			router.refresh();
		} catch (error: unknown) {
			toastError({
				title: "Error",
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setLoading(false);
		}
	};

	const onUnsubscribe = async () => {
		setLoading(true);
		try {
			const result = await cancelStoreSubscriptionAction({
				storeId: String(params.storeId),
				note: "Cancelled by admin",
			});

			if (result?.serverError) {
				toastError({
					title: "Error",
					description: result.serverError,
				});
				return;
			}

			toastSuccess({
				title: "Subscription cancelled.",
				description: "",
			});
			router.refresh();
		} catch (error: unknown) {
			toastError({
				title: "Error",
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setLoading(false);
		}
	};

	if (!initialData) return;

	return (
		<>
			<Card>
				<CardContent className="space-y-2">
					store level
					<Button variant="outline" size="sm">
						<Link
							href={`/storeAdmin/${initialData.id}/subscribe`}
							className="text-xs"
						>
							{initialData.level === StoreLevel.Free
								? t("store_admin_switch_level_free")
								: initialData.level === StoreLevel.Pro
									? t("store_admin_switch_level_pro")
									: t("store_admin_switch_level_multi")}
						</Link>
					</Button>
					{subscription !== null && subscription.subscriptionId !== "" && (
						<div className="grid grid-cols-5 text-xs">
							<div>status:</div>
							<div>{SubscriptionStatus[subscription.status]}</div>
							<div>updatedAt:</div>
							<div>
								{formatDateTime(
									typeof subscription.updatedAt === "bigint"
										? (epochToDate(subscription.updatedAt) ?? new Date())
										: typeof subscription.updatedAt === "number"
											? (epochToDate(BigInt(subscription.updatedAt)) ??
												new Date())
											: new Date(),
								)}
							</div>
							<Button
								size="sm"
								disabled={subscription.status !== SubscriptionStatus.Active}
								onClick={onUnsubscribe}
							>
								Unsubscribe
							</Button>
						</div>
					)}
					<Separator />
					<div className="relative">
						{(loading || form.formState.isSubmitting) && (
							<div
								className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
								aria-hidden="true"
							>
								<div className="flex flex-col items-center gap-3">
									<Loader />
									<span className="text-sm font-medium text-muted-foreground">
										{t("saving") || "Saving..."}
									</span>
								</div>
							</div>
						)}
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmit)}
								className="w-full space-y-1"
							>
								<FormField
									control={form.control}
									name="level"
									render={({ field }) => (
										<FormItem>
											<FormLabel>store level</FormLabel>
											<FormControl>
												<Select
													disabled={loading || form.formState.isSubmitting}
													value={
														field.value !== undefined && field.value !== null
															? String(field.value)
															: ""
													}
													onValueChange={(value) =>
														field.onChange(Number(value))
													}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select level" />
													</SelectTrigger>
													<SelectContent>
														{levelOptions.map((opt) => (
															<SelectItem key={opt.value} value={opt.value}>
																{opt.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="subscriptionId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Subscription schedule Id</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													value={field.value ?? ""}
													onChange={(e) => field.onChange(e.target.value)}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="expiration"
									render={({ field }) => (
										<FormItem className="flex flex-col">
											<FormLabel>Expiration</FormLabel>
											<Popover>
												<PopoverTrigger asChild>
													<FormControl>
														<Button
															variant={"outline"}
															className={cn(
																"w-[240px] pl-3 text-left font-normal",
																!field.value && "text-muted-foreground",
															)}
														>
															{field.value ? (
																format(field.value, "PPP")
															) : (
																<span>Pick a date</span>
															)}
															<IconCalendar className="ml-auto size-4 opacity-50" />
														</Button>
													</FormControl>
												</PopoverTrigger>
												<PopoverContent className="w-auto p-0" align="start">
													<Calendar
														mode="single"
														selected={field.value ?? undefined}
														onSelect={(value) =>
															field.onChange(value ?? undefined)
														}
														disabled={(date) =>
															date > new Date("3000-12-31") ||
															date < new Date("1900-01-01")
														}
														initialFocus
													/>
												</PopoverContent>
											</Popover>

											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="note"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Subscription Note</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													className="font-mono"
													value={field.value ?? ""}
													onChange={(e) => field.onChange(e.target.value)}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<Button
									disabled={
										loading ||
										!form.formState.isValid ||
										form.formState.isSubmitting
									}
									className="disabled:opacity-25"
									type="submit"
								>
									{t("save")}
								</Button>

								<Button
									type="button"
									variant="outline"
									onClick={() => {
										clearErrors();
										router.push("../");
									}}
									disabled={loading || form.formState.isSubmitting}
									className="ml-2 disabled:opacity-25"
								>
									{t("cancel")}
								</Button>
							</form>
						</Form>
					</div>
				</CardContent>
			</Card>
		</>
	);
};
