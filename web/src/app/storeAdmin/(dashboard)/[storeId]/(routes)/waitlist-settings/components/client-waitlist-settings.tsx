"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";

import { updateWaitlistSettingsAction } from "@/actions/storeAdmin/waitlist/update-waitlist-settings";
import {
	type UpdateWaitlistSettingsInput,
	updateWaitlistSettingsSchema,
} from "@/actions/storeAdmin/waitlist/update-waitlist-settings.validation";
import { useTranslation } from "@/app/i18n/client";
import { AdminSettingsTabFormFooter } from "@/components/admin-settings-tabs";
import { FormSubmitOverlay } from "@/components/form-submit-overlay";
import { Heading } from "@/components/heading";
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { adminCrudUseFormProps } from "@/lib/admin/form-defaults";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";

/** Server-picked booleans for the waitlist settings form (no Prisma BigInt on the client). */
export interface WaitListSettingsFormSource {
	enabled: boolean;
	requireSignIn: boolean;
	requireName: boolean;
	requirePhone: boolean;
	canGetNumBefore: number;
	missedTurnEnabled: boolean;
	missedTurnMinutesAfterCall: number;
	missedTurnRequeuePositionFromTop: number;
	showQueueOnWaitlistPage: boolean;
}

interface Props {
	storeId: string;
	initialSettings: WaitListSettingsFormSource | null;
}

function buildDefaults(
	row: WaitListSettingsFormSource | null,
): UpdateWaitlistSettingsInput {
	if (!row) {
		return {
			enabled: false,
			requireSignIn: false,
			requireName: false,
			requirePhone: false,
			canGetNumBefore: 0,
			missedTurnEnabled: true,
			missedTurnMinutesAfterCall: 5,
			missedTurnRequeuePositionFromTop: 3,
			showQueueOnWaitlistPage: false,
		};
	}
	return {
		enabled: row.enabled,
		requireSignIn: row.requireSignIn,
		requireName: row.requireName,
		requirePhone: row.requirePhone,
		canGetNumBefore: row.canGetNumBefore,
		missedTurnEnabled: row.missedTurnEnabled,
		missedTurnMinutesAfterCall: row.missedTurnMinutesAfterCall,
		missedTurnRequeuePositionFromTop: row.missedTurnRequeuePositionFromTop,
		showQueueOnWaitlistPage: row.showQueueOnWaitlistPage,
	};
}

export function ClientWaitlistSettings({ storeId, initialSettings }: Props) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [submitting, setSubmitting] = useState(false);

	const defaultValues = useMemo(
		() => buildDefaults(initialSettings),
		[initialSettings],
	);

	const form = useForm<UpdateWaitlistSettingsInput>({
		...adminCrudUseFormProps,
		resolver: zodResolver(
			updateWaitlistSettingsSchema,
		) as Resolver<UpdateWaitlistSettingsInput>,
		defaultValues,
	});

	useEffect(() => {
		form.reset(buildDefaults(initialSettings));
	}, [initialSettings, form]);

	const onSubmit = useCallback(
		async (data: UpdateWaitlistSettingsInput) => {
			setSubmitting(true);
			try {
				const result = await updateWaitlistSettingsAction(storeId, data);
				if (result?.serverError) {
					toastError({ description: result.serverError });
					return;
				}
				const raw = result?.data?.waitListSettings as
					| {
							enabled: boolean;
							requireSignIn: boolean;
							requireName: boolean;
							requirePhone: boolean;
							canGetNumBefore: number;
							missedTurnEnabled: boolean;
							missedTurnMinutesAfterCall: number;
							missedTurnRequeuePositionFromTop: number;
							showQueueOnWaitlistPage: boolean;
					  }
					| undefined;
				const next: WaitListSettingsFormSource | undefined = raw
					? {
							enabled: raw.enabled,
							requireSignIn: raw.requireSignIn,
							requireName: raw.requireName,
							requirePhone: raw.requirePhone,
							canGetNumBefore: raw.canGetNumBefore,
							missedTurnEnabled: raw.missedTurnEnabled,
							missedTurnMinutesAfterCall: raw.missedTurnMinutesAfterCall,
							missedTurnRequeuePositionFromTop:
								raw.missedTurnRequeuePositionFromTop,
							showQueueOnWaitlistPage: raw.showQueueOnWaitlistPage,
						}
					: undefined;
				if (next) {
					form.reset(buildDefaults(next));
				}
				toastSuccess({ description: t("settings_saved") });
			} catch (err: unknown) {
				toastError({
					description: err instanceof Error ? err.message : String(err),
				});
			} finally {
				setSubmitting(false);
			}
		},
		[storeId, t, form],
	);

	const navPrefix = `/storeAdmin/${storeId}`;

	const fieldLabels: Record<string, string> = {
		enabled: t("store_admin_rsvp_waitlist_enabled"),
		requireSignIn: t("store_admin_rsvp_waitlist_require_signin"),
		requireName: t("store_admin_rsvp_waitlist_require_name"),
		requirePhone: t("store_admin_rsvp_waitlist_require_phone"),
		canGetNumBefore: t("store_admin_waitlist_can_get_num_before"),
		missedTurnEnabled: t("store_admin_waitlist_missed_turn_enabled"),
		missedTurnMinutesAfterCall: t(
			"store_admin_waitlist_missed_turn_minutes_after_call",
		),
		missedTurnRequeuePositionFromTop: t(
			"store_admin_waitlist_missed_turn_requeue_position",
		),
		showQueueOnWaitlistPage: t("store_admin_waitlist_show_queue_on_page"),
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<Heading
					title={t("store_admin_waitlist_settings")}
					description={t("store_admin_waitlist_settings_page_descr")}
				/>
				<Button
					variant="outline"
					size="sm"
					className="touch-manipulation"
					asChild
				>
					<Link href={`${navPrefix}/rsvp-settings`}>
						{t("store_admin_rsvp_settings")}
					</Link>
				</Button>
			</div>
			<Separator />

			<Form {...form}>
				<div className="relative">
					<FormSubmitOverlay
						visible={submitting}
						statusText={t("submitting")}
					/>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-6"
						aria-busy={submitting}
					>
						{Object.keys(form.formState.errors).length > 0 && (
							<div className="rounded-md border border-destructive/50 bg-destructive/15 p-3 space-y-1.5">
								<div className="text-destructive text-sm font-semibold">
									{t("please_fix_validation_errors")}
								</div>
								{Object.entries(form.formState.errors).map(([field, error]) => (
									<div
										key={field}
										className="text-destructive flex items-start gap-2 text-sm"
									>
										<span className="font-medium">
											{fieldLabels[field] ?? field}:
										</span>
										<span>{error.message as string}</span>
									</div>
								))}
							</div>
						)}

						<Card>
							<CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
								<FormField
									control={form.control}
									name="enabled"
									render={({ field, fieldState }) => (
										<FormItem
											className={cn(
												"flex flex-row items-center justify-between rounded-lg border p-3 sm:col-span-2",
												fieldState.error &&
													"border-destructive/50 bg-destructive/5",
											)}
										>
											<FormLabel>
												{t("store_admin_rsvp_waitlist_enabled")}
											</FormLabel>
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
									name="showQueueOnWaitlistPage"
									render={({ field, fieldState }) => (
										<FormItem
											className={cn(
												"flex flex-row items-center justify-between rounded-lg border p-3 sm:col-span-2",
												fieldState.error &&
													"border-destructive/50 bg-destructive/5",
											)}
										>
											<div className="space-y-0.5 pr-3">
												<FormLabel>
													{t("store_admin_waitlist_show_queue_on_page")}
												</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("store_admin_waitlist_show_queue_on_page_descr")}
												</FormDescription>
											</div>
											<FormControl>
												<Switch
													checked={field.value}
													onCheckedChange={field.onChange}
													disabled={submitting || !form.watch("enabled")}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="requireSignIn"
									render={({ field, fieldState }) => (
										<FormItem
											className={cn(
												"flex flex-row items-center justify-between rounded-lg border p-3",
												fieldState.error &&
													"border-destructive/50 bg-destructive/5",
											)}
										>
											<FormLabel>
												{t("store_admin_rsvp_waitlist_require_signin")}
											</FormLabel>
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
									name="requireName"
									render={({ field, fieldState }) => (
										<FormItem
											className={cn(
												"flex flex-row items-center justify-between rounded-lg border p-3",
												fieldState.error &&
													"border-destructive/50 bg-destructive/5",
											)}
										>
											<FormLabel>
												{t("store_admin_rsvp_waitlist_require_name")}
											</FormLabel>
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
									name="requirePhone"
									render={({ field, fieldState }) => (
										<FormItem
											className={cn(
												"flex flex-row items-center justify-between rounded-lg border p-3",
												fieldState.error &&
													"border-destructive/50 bg-destructive/5",
											)}
										>
											<FormLabel>
												{t("store_admin_rsvp_waitlist_require_phone")}
											</FormLabel>
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
									name="canGetNumBefore"
									render={({ field }) => (
										<FormItem className="sm:col-span-2">
											<FormLabel>
												{t("store_admin_waitlist_can_get_num_before")}
											</FormLabel>
											<FormControl>
												<Input
													type="number"
													disabled={submitting}
													value={Number.isFinite(field.value) ? field.value : 0}
													onChange={(e) => {
														const v = Number.parseInt(e.target.value, 10);
														field.onChange(Number.isFinite(v) ? v : 0);
													}}
												/>
											</FormControl>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("store_admin_waitlist_can_get_num_before_descr")}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
								<FormField
									control={form.control}
									name="missedTurnEnabled"
									render={({ field, fieldState }) => (
										<FormItem
											className={cn(
												"flex flex-row items-center justify-between rounded-lg border p-3 sm:col-span-2",
												fieldState.error &&
													"border-destructive/50 bg-destructive/5",
											)}
										>
											<div className="space-y-0.5">
												<FormLabel>
													{t("store_admin_waitlist_missed_turn_enabled")}
												</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("store_admin_waitlist_missed_turn_enabled_descr")}
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
									name="missedTurnMinutesAfterCall"
									render={({ field, fieldState }) => (
										<FormItem
											className={cn(
												fieldState.error &&
													"rounded-md border border-destructive/50 bg-destructive/5 p-2",
											)}
										>
											<FormLabel>
												{t(
													"store_admin_waitlist_missed_turn_minutes_after_call",
												)}
											</FormLabel>
											<FormControl>
												<Input
													type="number"
													min={1}
													max={120}
													disabled={
														submitting || !form.watch("missedTurnEnabled")
													}
													value={Number.isFinite(field.value) ? field.value : 5}
													onChange={(e) => {
														const v = Number.parseInt(e.target.value, 10);
														field.onChange(Number.isFinite(v) ? v : 5);
													}}
												/>
											</FormControl>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t(
													"store_admin_waitlist_missed_turn_minutes_after_call_descr",
												)}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="missedTurnRequeuePositionFromTop"
									render={({ field, fieldState }) => (
										<FormItem
											className={cn(
												fieldState.error &&
													"rounded-md border border-destructive/50 bg-destructive/5 p-2",
											)}
										>
											<FormLabel>
												{t("store_admin_waitlist_missed_turn_requeue_position")}
											</FormLabel>
											<FormControl>
												<Input
													type="number"
													min={1}
													max={99}
													disabled={
														submitting || !form.watch("missedTurnEnabled")
													}
													value={Number.isFinite(field.value) ? field.value : 3}
													onChange={(e) => {
														const v = Number.parseInt(e.target.value, 10);
														field.onChange(Number.isFinite(v) ? v : 3);
													}}
												/>
											</FormControl>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t(
													"store_admin_waitlist_missed_turn_requeue_position_descr",
												)}
											</FormDescription>
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
								className="touch-manipulation"
							>
								{t("save")}
							</Button>
						</AdminSettingsTabFormFooter>
					</form>
				</div>
			</Form>

			<p className="text-muted-foreground text-sm">
				<Link
					href={`${navPrefix}/waitlist`}
					className="underline underline-offset-4 hover:text-foreground"
				>
					{t("store_admin_waitlist_queue")}
				</Link>
				{" — "}
				{t("store_admin_waitlist_settings_queue_hint")}
			</p>
		</div>
	);
}
