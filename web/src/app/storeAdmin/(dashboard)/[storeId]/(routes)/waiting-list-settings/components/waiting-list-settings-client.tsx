"use client";

import { updateRsvpSettingsAction } from "@/actions/storeAdmin/rsvpSettings/update-rsvp-settings";
import { updateRsvpSettingsSchema } from "@/actions/storeAdmin/rsvpSettings/update-rsvp-settings.validation";
import { useTranslation } from "@/app/i18n/client";
import { Loader } from "@/components/loader";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/providers/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const waitlistSettingsFormSchema = updateRsvpSettingsSchema.pick({
	waitlistEnabled: true,
	waitlistRequireSignIn: true,
	waitlistRequireName: true,
});

type WaitlistFormValues = z.infer<typeof waitlistSettingsFormSchema>;

export interface WaitingListSettingsClientProps {
	initialValues: {
		waitlistEnabled: boolean;
		waitlistRequireSignIn: boolean;
		waitlistRequireName: boolean;
	};
}

export function WaitingListSettingsClient({
	initialValues,
}: WaitingListSettingsClientProps) {
	const params = useParams();
	const storeId = String(params.storeId ?? "");
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [loading, setLoading] = useState(false);

	const defaultValues = useMemo<WaitlistFormValues>(
		() => ({
			waitlistEnabled: initialValues.waitlistEnabled,
			waitlistRequireSignIn: initialValues.waitlistRequireSignIn,
			waitlistRequireName: initialValues.waitlistRequireName,
		}),
		[initialValues],
	);

	const form = useForm<WaitlistFormValues>({
		resolver: zodResolver(waitlistSettingsFormSchema),
		defaultValues,
		mode: "onChange",
	});

	useEffect(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const onSubmit = async (data: WaitlistFormValues) => {
		setLoading(true);
		try {
			const result = await updateRsvpSettingsAction(storeId, {
				waitlistEnabled: data.waitlistEnabled,
				waitlistRequireSignIn: data.waitlistRequireSignIn,
				waitlistRequireName: data.waitlistRequireName,
			});

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
				return;
			}

			toastSuccess({
				title: t("store_updated"),
				description: "",
			});
		} catch (error: unknown) {
			toastError({
				title: t("error_title"),
				description:
					error instanceof Error ? error.message : "Something went wrong.",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<div className="mb-6">
				<Heading title={t("store_settings_waiting_list")} />
			</div>

			<Card>
				<CardContent className="pt-6">
					<div
						className="relative"
						aria-busy={loading || form.formState.isSubmitting}
					>
						{(loading || form.formState.isSubmitting) && (
							<div
								className="absolute inset-0 z-100 flex cursor-wait select-none items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
								aria-live="polite"
								aria-label={t("saving")}
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
								className="space-y-6"
							>
								<div className="text-sm font-medium">{t("waitlist_mgmt")}</div>

								<FormField
									control={form.control}
									name="waitlistEnabled"
									render={({ field, fieldState }) => (
										<FormItem
											className={
												fieldState.error
													? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
													: undefined
											}
										>
											<div className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
												<div className="space-y-0.5">
													<FormLabel>
														{t("waitlist_settings_enabled")}
													</FormLabel>
													<FormDescription className="text-xs font-mono text-gray-500">
														{t("waitlist_not_available")?.replace(
															" for this store.",
															"",
														) ||
															"Allow customers to join the door queue (waitlist)."}
													</FormDescription>
												</div>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
														disabled={loading || form.formState.isSubmitting}
													/>
												</FormControl>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="waitlistRequireSignIn"
									render={({ field, fieldState }) => (
										<FormItem
											className={
												fieldState.error
													? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
													: undefined
											}
										>
											<div className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
												<div className="space-y-0.5">
													<FormLabel>
														{t("waitlist_settings_require_sign_in")}
													</FormLabel>
													<FormDescription className="text-xs font-mono text-gray-500">
														{t("waitlist_sign_in_required") ||
															"Require sign-in to join waitlist."}
													</FormDescription>
												</div>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
														disabled={loading || form.formState.isSubmitting}
													/>
												</FormControl>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="waitlistRequireName"
									render={({ field, fieldState }) => (
										<FormItem
											className={
												fieldState.error
													? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
													: undefined
											}
										>
											<div className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
												<div className="space-y-0.5">
													<FormLabel>
														{t("waitlist_settings_require_name")}
													</FormLabel>
													<FormDescription className="text-xs font-mono text-gray-500">
														{t("waitlist_settings_require_name_descr")}
													</FormDescription>
												</div>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
														disabled={loading || form.formState.isSubmitting}
													/>
												</FormControl>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>

								<Separator />

								<div className="flex flex-wrap gap-2 pt-2">
									<Button
										type="submit"
										disabled={
											loading ||
											!form.formState.isValid ||
											form.formState.isSubmitting
										}
										className="disabled:opacity-25 touch-manipulation"
									>
										{t("save")}
									</Button>
									<Button
										type="button"
										variant="outline"
										onClick={() => form.reset(defaultValues)}
										disabled={loading || form.formState.isSubmitting}
										className="touch-manipulation"
									>
										{t("cancel")}
									</Button>
								</div>
							</form>
						</Form>
					</div>
				</CardContent>
			</Card>
		</>
	);
}
