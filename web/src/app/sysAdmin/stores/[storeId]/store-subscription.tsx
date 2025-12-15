"use client";
import { toastError, toastSuccess } from "@/components/toaster";
import { cn } from "@/utils/utils";
import { formatDateTime, epochToDate } from "@/utils/datetime-utils";
import { zodResolver } from "@hookform/resolvers/zod";

import { useTranslation } from "@/app/i18n/client";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/providers/i18n-provider";
import { StoreLevel, SubscriptionStatus } from "@/types/enum";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import type { Store, StoreSubscription } from "@prisma/client";

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

const formSchema = z.object({
	subscriptionId: z.string().optional(),
	expiration: z.date().optional(),
	/*
		expiration: z.date({
			required_error: "expiration is required.",
		  }),
	*/
	note: z.string().optional(),
	level: z.number(),
});

type formValues = z.infer<typeof formSchema>;

export interface SettingsFormProps {
	initialData: Store;
	subscription: StoreSubscription | null;
}

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

	const defaultValues = initialData
		? {
				...initialData,
				...subscription,
			}
		: {};

	//console.log('defaultValues: ' + JSON.stringify(defaultValues));
	const form = useForm<formValues>({
		resolver: zodResolver(formSchema),
		defaultValues,
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		clearErrors,
	} = useForm<formValues>();

	//const isSubmittable = !!form.formState.isDirty && !!form.formState.isValid;

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const onSubmit = async (data: formValues) => {
		logger.info("Operation log");

		setLoading(true);

		await axios.patch(
			`${process.env.NEXT_PUBLIC_API_URL}/sysAdmin/stores/${params.storeId}/subscription`,
			data,
		);
		router.refresh();

		toastSuccess({
			title: "Subscription updated.",
			description: "",
		});

		setLoading(false);
	};

	const onUnsubscribe = async () => {
		setLoading(true);

		const url = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/unsubscribe`;
		await axios.post(url);

		router.refresh();

		toastSuccess({
			title: "Subscription cancelled.",
			description: "",
		});

		setLoading(false);
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
								? t("storeAdmin_switchLevel_free")
								: initialData.level === StoreLevel.Pro
									? t("storeAdmin_switchLevel_pro")
									: t("storeAdmin_switchLevel_multi")}
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
											<Input
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
												{...field}
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
													selected={field.value}
													onSelect={field.onChange}
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
												{...field}
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
				</CardContent>
			</Card>
		</>
	);
};
