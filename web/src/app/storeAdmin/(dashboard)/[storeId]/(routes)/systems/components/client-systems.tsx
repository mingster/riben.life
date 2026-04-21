"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { updateStoreSystemsAction } from "@/actions/storeAdmin/settings/update-store-systems";
import {
	type UpdateStoreSystemsInput,
	updateStoreSystemsSchema,
} from "@/actions/storeAdmin/settings/update-store-systems.validation";
import { useTranslation } from "@/app/i18n/client";
import { AdminSettingsTabFormFooter } from "@/components/admin-settings-tabs";
import { Heading } from "@/components/heading";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface Props {
	storeId: string;
	initialUseOrderSystem: boolean;
	initialAcceptReservation: boolean;
	initialWaitlistEnabled: boolean;
}

export function SystemsClient({
	storeId,
	initialUseOrderSystem,
	initialAcceptReservation,
	initialWaitlistEnabled,
}: Props) {
	const { t } = useTranslation();
	const router = useRouter();
	const [submitting, setSubmitting] = useState(false);

	const form = useForm<UpdateStoreSystemsInput>({
		resolver: zodResolver(updateStoreSystemsSchema),
		defaultValues: {
			useOrderSystem: initialUseOrderSystem,
			acceptReservation: initialAcceptReservation,
			waitlistEnabled: initialWaitlistEnabled,
		},
		mode: "onChange",
	});

	const onSubmit = useCallback(
		async (data: UpdateStoreSystemsInput) => {
			setSubmitting(true);
			try {
				const result = await updateStoreSystemsAction(storeId, data);
				if (result?.serverError) {
					toastError({ description: result.serverError });
					return;
				}
				toastSuccess({ description: t("settings_saved") });
				if (result?.data) {
					form.reset(result.data);
				}
				router.refresh();
			} catch (err: unknown) {
				toastError({
					description: err instanceof Error ? err.message : String(err),
				});
			} finally {
				setSubmitting(false);
			}
		},
		[storeId, form, t, router],
	);

	return (
		<div className="relative space-y-6" aria-busy={submitting}>
			{submitting && (
				<div
					className="absolute inset-0 z-100 flex cursor-wait select-none items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
					aria-live="polite"
					role="status"
				>
					<span className="text-sm font-medium text-muted-foreground">
						{t("submitting")}
					</span>
				</div>
			)}
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<Heading
					title={t("store_admin_systems_title")}
					description={t("store_admin_systems_description")}
				/>
			</div>
			<Separator />
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="space-y-0"
					aria-busy={submitting}
				>
					<Card>
						<CardHeader>
							<CardTitle>{t("store_admin_systems_card_title")}</CardTitle>
							<CardDescription>
								{t("store_admin_systems_card_description")}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<FormField
								control={form.control}
								name="useOrderSystem"
								render={({ field, fieldState }) => (
									<FormItem
										className={cn(
											"flex flex-row items-center justify-between rounded-lg border p-3",
											fieldState.error &&
												"border-destructive/50 bg-destructive/5",
										)}
									>
										<div className="space-y-0.5">
											<FormLabel>
												{t("store_admin_systems_order_system")}
											</FormLabel>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("store_admin_systems_order_system_descr")}
											</FormDescription>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
												disabled={submitting}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="acceptReservation"
								render={({ field, fieldState }) => (
									<FormItem
										className={cn(
											"flex flex-row items-center justify-between rounded-lg border p-3",
											fieldState.error &&
												"border-destructive/50 bg-destructive/5",
										)}
									>
										<div className="space-y-0.5">
											<FormLabel>{t("store_admin_systems_rsvp")}</FormLabel>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("store_admin_systems_rsvp_descr")}
											</FormDescription>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
												disabled={submitting}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="waitlistEnabled"
								render={({ field, fieldState }) => (
									<FormItem
										className={cn(
											"flex flex-row items-center justify-between rounded-lg border p-3",
											fieldState.error &&
												"border-destructive/50 bg-destructive/5",
										)}
									>
										<div className="space-y-0.5">
											<FormLabel>{t("store_admin_systems_waitlist")}</FormLabel>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("store_admin_systems_waitlist_descr")}
											</FormDescription>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
												disabled={submitting}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</CardContent>
					</Card>
					<AdminSettingsTabFormFooter>
						<Button
							type="submit"
							disabled={submitting || !form.formState.isValid}
							className="touch-manipulation disabled:opacity-25"
						>
							{t("save")}
						</Button>
					</AdminSettingsTabFormFooter>
				</form>
			</Form>
		</div>
	);
}
