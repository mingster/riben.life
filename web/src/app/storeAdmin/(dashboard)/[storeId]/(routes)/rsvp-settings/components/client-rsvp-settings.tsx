"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";

import { getMyGoogleCalendarConnectionAction } from "@/actions/storeAdmin/google-calendar/get-my-google-calendar-connection";
import type { ListGoogleCalendarListError } from "@/actions/storeAdmin/google-calendar/list-google-calendar-calendars";
import { listGoogleCalendarCalendarsAction } from "@/actions/storeAdmin/google-calendar/list-google-calendar-calendars";
import { resumeGoogleCalendarSyncAction } from "@/actions/storeAdmin/google-calendar/resume-google-calendar-sync";
import { updateGoogleCalendarConnectionCalendarAction } from "@/actions/storeAdmin/google-calendar/update-google-calendar-connection-calendar";
import { updateRsvpSettingsAction } from "@/actions/storeAdmin/rsvpSettings/update-rsvp-settings";
import {
	type UpdateRsvpSettingsInput,
	updateRsvpSettingsSchema,
} from "@/actions/storeAdmin/rsvpSettings/update-rsvp-settings.validation";
import { useTranslation } from "@/app/i18n/client";
import {
	AdminSettingsTabFormFooter,
	AdminSettingsTabs,
	AdminSettingsTabsContent,
	AdminSettingsTabsList,
	AdminSettingsTabsTrigger,
} from "@/components/admin-settings-tabs";
import { Heading } from "@/components/heading";
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
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { linkSocial } from "@/lib/auth-client";
import { BusinessHoursEditor } from "@/lib/businessHours";
import { GOOGLE_CALENDAR_RSVP_LINK_SCOPES } from "@/lib/google-calendar/google-calendar-oauth-scopes";
import type { WritableGoogleCalendarOption } from "@/lib/google-calendar/list-writable-google-calendars";
import {
	internalMinorToMajor,
	majorUnitsToInternalMinor,
} from "@/lib/payment/stripe/stripe-money";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import type { RsvpSettings as RsvpSettingsRow } from "@/types";
import { RsvpMode } from "@/types/enum";
import { epochToDate } from "@/utils/datetime-utils";

import type { RsvpBlacklistColumn } from "./rsvp-blacklist-column";
import { RsvpBlacklistTable } from "./rsvp-blacklist-table";

function googleCalendarListErrorDescription(
	err: ListGoogleCalendarListError,
	t: (key: string) => string,
): string {
	switch (err) {
		case "unauthorized":
			return t("store_settings_google_calendar_oauth_error");
		case "list_failed":
			return t("store_settings_google_calendar_list_failed");
		case "calendar_not_signed_up":
			return t("store_settings_google_calendar_not_signed_up");
	}
}

interface Props {
	storeId: string;
	/** Store timezone for the business-hours editor when editing custom RSVP hours. */
	storeDefaultTimezone: string;
	/** ISO currency code for prepaid amount display (matches checkout internal minor encoding). */
	storeDefaultCurrency: string;
	initialSettings: RsvpSettingsRow | null;
	initialBlacklist: RsvpBlacklistColumn[];
}

function buildFormDefaults(
	row: RsvpSettingsRow | null,
): UpdateRsvpSettingsInput {
	if (!row) {
		return {
			acceptReservation: true,
			singleServiceMode: false,
			minPrepaidPercentage: 0,
			minPrepaidAmount: 0,
			noNeedToConfirm: false,
			canCancel: true,
			cancelHours: 24,
			canReserveBefore: 120,
			canReserveAfter: 2190,
			defaultDuration: 60,
			requireSignature: false,
			showCostToCustomer: false,
			mustSelectFacility: false,
			mustHaveServiceStaff: false,
			rsvpMode: RsvpMode.FACILITY,
			maxCapacity: 0,
			useBusinessHours: true,
			rsvpHours: null,
			reminderHours: 3,
			confirmHours: 24,
			syncWithGoogle: false,
			syncWithApple: false,
			reserveWithGoogleEnabled: false,
			googleBusinessProfileId: null,
			googleBusinessProfileName: null,
		};
	}

	const tokenExp = row.reserveWithGoogleTokenExpiry
		? epochToDate(row.reserveWithGoogleTokenExpiry)
		: null;
	const lastSync = row.reserveWithGoogleLastSync
		? epochToDate(row.reserveWithGoogleLastSync)
		: null;

	return {
		acceptReservation: row.acceptReservation,
		singleServiceMode: row.singleServiceMode,
		minPrepaidPercentage: row.minPrepaidPercentage,
		minPrepaidAmount: row.minPrepaidAmount,
		noNeedToConfirm: row.noNeedToConfirm,
		canCancel: row.canCancel,
		cancelHours: row.cancelHours,
		canReserveBefore: row.canReserveBefore,
		canReserveAfter: row.canReserveAfter,
		defaultDuration: row.defaultDuration,
		requireSignature: row.requireSignature,
		showCostToCustomer: row.showCostToCustomer,
		mustSelectFacility: row.mustSelectFacility,
		mustHaveServiceStaff: row.mustHaveServiceStaff,
		rsvpMode: row.rsvpMode ?? RsvpMode.FACILITY,
		maxCapacity: row.maxCapacity ?? 0,
		useBusinessHours: row.useBusinessHours,
		rsvpHours: row.rsvpHours,
		reminderHours: row.reminderHours,
		confirmHours: row.confirmHours,
		syncWithGoogle: row.syncWithGoogle,
		syncWithApple: row.syncWithApple,
		reserveWithGoogleEnabled: row.reserveWithGoogleEnabled,
		googleBusinessProfileId: row.googleBusinessProfileId,
		googleBusinessProfileName: row.googleBusinessProfileName,
		reserveWithGoogleTokenExpiry: tokenExp ?? undefined,
		reserveWithGoogleLastSync: lastSync ?? undefined,
		reserveWithGoogleSyncStatus: row.reserveWithGoogleSyncStatus,
		reserveWithGoogleError: row.reserveWithGoogleError,
	};
}

export function RsvpSettingsClient({
	storeId,
	storeDefaultTimezone,
	storeDefaultCurrency,
	initialSettings,
	initialBlacklist,
}: Props) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [submitting, setSubmitting] = useState(false);
	const [activeTab, setActiveTab] = useState("general");
	const [googleCalendarLinking, setGoogleCalendarLinking] = useState(false);
	const [syncWithGoogleSaving, setSyncWithGoogleSaving] = useState(false);
	const [gcalUiLoading, setGcalUiLoading] = useState(false);
	const [gcalListLoading, setGcalListLoading] = useState(false);
	const [gcalConnected, setGcalConnected] = useState(false);
	const [gcalNeedsReconnect, setGcalNeedsReconnect] = useState(false);
	const [gcalSelectedCalendarId, setGcalSelectedCalendarId] = useState<
		string | null
	>(null);
	const [gcalCalendars, setGcalCalendars] = useState<
		WritableGoogleCalendarOption[]
	>([]);
	const [gcalListError, setGcalListError] =
		useState<ListGoogleCalendarListError | null>(null);
	const [gcalCalendarSaving, setGcalCalendarSaving] = useState(false);
	const [blacklist, setBlacklist] =
		useState<RsvpBlacklistColumn[]>(initialBlacklist);

	useEffect(() => {
		const search = window.location.search;
		const params = new URLSearchParams(search);
		if (params.get("tab") !== "hours") {
			return;
		}
		setActiveTab("hours");
		params.delete("tab");
		const query = params.toString();
		const path = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
		window.history.replaceState(null, "", path);
	}, []);

	const defaultValues = useMemo(
		() => buildFormDefaults(initialSettings),
		[initialSettings],
	);

	const form = useForm<UpdateRsvpSettingsInput>({
		resolver: zodResolver(
			updateRsvpSettingsSchema,
		) as Resolver<UpdateRsvpSettingsInput>,
		defaultValues,
		mode: "onChange",
	});

	const syncWithGoogleOn = form.watch("syncWithGoogle");
	const canCancelEnabled = form.watch("canCancel");
	const rsvpModeWatched = form.watch("rsvpMode");

	const onSubmit = useCallback(
		async (data: UpdateRsvpSettingsInput) => {
			setSubmitting(true);
			try {
				const result = await updateRsvpSettingsAction(storeId, data);
				if (result?.serverError) {
					toastError({ description: result.serverError });
					return;
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
		[storeId, t],
	);

	const useBh = form.watch("useBusinessHours");

	const navPrefix = `/storeAdmin/${storeId}`;

	const loadGoogleCalendarUi = useCallback(async () => {
		setGcalUiLoading(true);
		setGcalListError(null);
		setGcalListLoading(false);
		try {
			const connRes = await getMyGoogleCalendarConnectionAction(storeId, {});
			if (connRes?.serverError) {
				toastError({ description: connRes.serverError });
				setGcalConnected(false);
				setGcalNeedsReconnect(false);
				setGcalSelectedCalendarId(null);
				setGcalCalendars([]);
				return;
			}
			const conn = connRes?.data;
			if (!conn) {
				return;
			}
			setGcalConnected(conn.connected);
			setGcalNeedsReconnect(conn.needsReconnect);
			setGcalSelectedCalendarId(conn.googleCalendarId);

			if (!conn.connected) {
				setGcalCalendars([]);
				setGcalUiLoading(false);
				return;
			}

			setGcalUiLoading(false);
			setGcalListLoading(true);
			const listRes = await listGoogleCalendarCalendarsAction(storeId, {});
			if (listRes?.serverError) {
				toastError({ description: listRes.serverError });
				setGcalCalendars([]);
				setGcalListError(null);
				return;
			}
			const list = listRes?.data;
			setGcalListError(list?.listError ?? null);
			setGcalCalendars(list?.calendars ?? []);
		} catch (err: unknown) {
			toastError({
				description: err instanceof Error ? err.message : String(err),
			});
			setGcalConnected(false);
			setGcalCalendars([]);
		} finally {
			setGcalListLoading(false);
			setGcalUiLoading(false);
		}
	}, [storeId]);

	const persistSyncWithGoogle = useCallback(
		async (next: boolean, previous: boolean) => {
			setSyncWithGoogleSaving(true);
			try {
				const result = await updateRsvpSettingsAction(storeId, {
					syncWithGoogle: next,
				});
				if (result?.serverError) {
					form.setValue("syncWithGoogle", previous, { shouldValidate: true });
					toastError({ description: result.serverError });
					return;
				}
				toastSuccess({ description: t("settings_saved") });
				if (next) {
					void loadGoogleCalendarUi();
				} else {
					setGcalConnected(false);
					setGcalNeedsReconnect(false);
					setGcalSelectedCalendarId(null);
					setGcalCalendars([]);
					setGcalListError(null);
				}
			} catch (err: unknown) {
				form.setValue("syncWithGoogle", previous, { shouldValidate: true });
				toastError({
					description: err instanceof Error ? err.message : String(err),
				});
			} finally {
				setSyncWithGoogleSaving(false);
			}
		},
		[form, loadGoogleCalendarUi, storeId, t],
	);

	useEffect(() => {
		if (!syncWithGoogleOn) {
			setGcalUiLoading(false);
			setGcalListLoading(false);
			setGcalConnected(false);
			setGcalNeedsReconnect(false);
			setGcalSelectedCalendarId(null);
			setGcalCalendars([]);
			setGcalListError(null);
			return;
		}
		void loadGoogleCalendarUi();
	}, [loadGoogleCalendarUi, syncWithGoogleOn]);

	const handleGoogleCalendarSelect = useCallback(
		async (value: string) => {
			if (value === "--") {
				return;
			}
			setGcalCalendarSaving(true);
			try {
				const result = await updateGoogleCalendarConnectionCalendarAction(
					storeId,
					{ googleCalendarId: value },
				);
				if (result?.serverError) {
					toastError({ description: result.serverError });
					return;
				}
				setGcalSelectedCalendarId(value);
				toastSuccess({
					description: t("store_settings_google_calendar_calendar_updated"),
				});
			} catch (err: unknown) {
				toastError({
					description: err instanceof Error ? err.message : String(err),
				});
			} finally {
				setGcalCalendarSaving(false);
			}
		},
		[storeId, t],
	);

	const handleRequestGoogleCalendarAccess = useCallback(async () => {
		setGoogleCalendarLinking(true);
		try {
			const resumeResult = await resumeGoogleCalendarSyncAction(storeId, {});
			if (resumeResult?.serverError) {
				toastError({ description: resumeResult.serverError });
				setGoogleCalendarLinking(false);
				return;
			}

			const callbackURL = `${window.location.origin}${navPrefix}/rsvp-settings?tab=hours`;
			const { error } = await linkSocial({
				provider: "google",
				scopes: [...GOOGLE_CALENDAR_RSVP_LINK_SCOPES],
				callbackURL,
			});
			if (error) {
				toastError({
					description:
						typeof error.message === "string" && error.message.length > 0
							? error.message
							: t("store_settings_google_calendar_oauth_error"),
				});
				setGoogleCalendarLinking(false);
				return;
			}
			// Successful flows redirect the browser to Google; do not clear loading here.
		} catch (err: unknown) {
			toastError({
				description: err instanceof Error ? err.message : String(err),
			});
			setGoogleCalendarLinking(false);
		}
	}, [navPrefix, storeId, t]);

	const googleCalendarSelectValue = useMemo(() => {
		if (
			gcalSelectedCalendarId &&
			gcalCalendars.some((c) => c.id === gcalSelectedCalendarId)
		) {
			return gcalSelectedCalendarId;
		}
		return "--";
	}, [gcalCalendars, gcalSelectedCalendarId]);

	const gcalActionsDisabled =
		submitting ||
		googleCalendarLinking ||
		syncWithGoogleSaving ||
		gcalCalendarSaving;

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<Heading
					title={t("store_admin_rsvp_settings_title")}
					description={t("store_admin_rsvp_settings_descr")}
				/>
				<Button
					variant="outline"
					size="sm"
					className="touch-manipulation"
					asChild
				>
					<Link href={`${navPrefix}/waitlist-settings`}>
						{t("store_admin_waitlist_settings")}
					</Link>
				</Button>
			</div>
			<Separator />

			<AdminSettingsTabs value={activeTab} onValueChange={setActiveTab}>
				<AdminSettingsTabsList>
					<AdminSettingsTabsTrigger value="general">
						{t("store_admin_rsvp_tab_general")}
					</AdminSettingsTabsTrigger>
					<AdminSettingsTabsTrigger value="policies">
						{t("store_admin_rsvp_tab_policies")}
					</AdminSettingsTabsTrigger>
					<AdminSettingsTabsTrigger value="hours">
						{t("store_admin_rsvp_tab_hours")}
					</AdminSettingsTabsTrigger>
					<AdminSettingsTabsTrigger value="blacklist">
						{t("store_admin_rsvp_tab_blacklist")}
					</AdminSettingsTabsTrigger>
				</AdminSettingsTabsList>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-0"
						aria-busy={submitting}
					>
						<AdminSettingsTabsContent value="general" className="space-y-0">
							<Card>
								<CardContent className="space-y-4 gap-4">
									<FormField
										control={form.control}
										name="acceptReservation"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:col-span-2">
												<div>
													<FormLabel>
														{t("store_settings_accept_reservation")}
													</FormLabel>
													<FormDescription className="text-xs font-mono text-gray-500">
														{t("store_settings_accept_reservation_descr")}
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
										name="rsvpMode"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t("store_admin_rsvp_mode")}</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("store_admin_rsvp_mode_descr")}
												</FormDescription>
												<Select
													value={String(field.value ?? RsvpMode.FACILITY)}
													onValueChange={(v) =>
														field.onChange(Number.parseInt(v, 10))
													}
													disabled={submitting}
												>
													<FormControl>
														<SelectTrigger>
															<SelectValue />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														<SelectItem value={String(RsvpMode.FACILITY)}>
															{t("rsvp_mode_facility")}
														</SelectItem>
														<SelectItem value={String(RsvpMode.STAFF_FORCE)}>
															{t("rsvp_mode_staff_force")}
														</SelectItem>
														<SelectItem value={String(RsvpMode.RESTAURANT)}>
															{t("rsvp_mode_restaurant")}
														</SelectItem>
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>
									{rsvpModeWatched === RsvpMode.RESTAURANT && (
										<FormField
											control={form.control}
											name="maxCapacity"
											render={({ field }) => (
												<FormItem>
													<FormLabel>
														{t("store_admin_rsvp_max_capacity")}
													</FormLabel>
													<FormDescription className="text-xs font-mono text-gray-500">
														{t("store_admin_rsvp_max_capacity_descr")}
													</FormDescription>
													<FormControl>
														<Input
															type="number"
															min={0}
															disabled={submitting}
															{...field}
															onChange={(e) =>
																field.onChange(
																	Number.parseInt(e.target.value, 10) || 0,
																)
															}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									)}
									<FormField
										control={form.control}
										name="singleServiceMode"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:col-span-2">
												<div>
													<FormLabel>
														{t("store_admin_rsvp_single_service")}
													</FormLabel>
													<FormDescription className="text-xs font-mono text-gray-500">
														{t("store_admin_rsvp_single_service_descr")}
													</FormDescription>
												</div>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
														disabled={submitting}
													/>
												</FormControl>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="minPrepaidPercentage"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{t("store_admin_rsvp_min_prepaid")}{" "}
													<span className="text-destructive">*</span>
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														min={0}
														max={100}
														disabled={submitting}
														{...field}
														onChange={(e) =>
															field.onChange(
																Number.parseInt(e.target.value, 10),
															)
														}
													/>
												</FormControl>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("store_admin_rsvp_min_prepaid_descr")}
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="minPrepaidAmount"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{t("store_admin_rsvp_min_prepaid_amount")}{" "}
													<span className="font-mono text-muted-foreground">
														({storeDefaultCurrency.toUpperCase()})
													</span>
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														min={0}
														step="0.01"
														disabled={submitting}
														value={internalMinorToMajor(field.value ?? 0)}
														onChange={(e) => {
															const raw = e.target.value;
															if (raw === "") {
																field.onChange(0);
																return;
															}
															const major = Number.parseFloat(raw);
															field.onChange(
																Number.isFinite(major)
																	? majorUnitsToInternalMinor(major)
																	: 0,
															);
														}}
													/>
												</FormControl>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("store_admin_rsvp_min_prepaid_amount_descr")}
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="defaultDuration"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{t("store_admin_rsvp_default_duration")}{" "}
													<span className="text-destructive">*</span>
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														min={1}
														disabled={submitting}
														{...field}
														onChange={(e) =>
															field.onChange(
																Number.parseInt(e.target.value, 10),
															)
														}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</CardContent>
							</Card>
						</AdminSettingsTabsContent>

						<AdminSettingsTabsContent value="policies" className="space-y-4">
							<Card>
								<CardContent className="space-y-4 gap-4">
									<FormField
										control={form.control}
										name="noNeedToConfirm"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
												<div>
													<FormLabel>
														{t("store_admin_rsvp_no_need_confirm")}
													</FormLabel>
													<FormDescription className="text-xs font-mono text-gray-500">
														{t("store_admin_rsvp_no_need_confirm_descr")}
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
										name="requireSignature"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
												<div>
													<FormLabel>
														{t("store_admin_rsvp_require_signature")}
													</FormLabel>
													<FormDescription className="text-xs font-mono text-gray-500">
														{t("store_admin_rsvp_require_signature_descr")}
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
										name="canCancel"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
												<FormLabel>
													{t("store_admin_rsvp_can_cancel")}
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
										name="cancelHours"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{t("store_admin_rsvp_cancel_hours")}
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														min={0}
														disabled={submitting || !canCancelEnabled}
														{...field}
														onChange={(e) =>
															field.onChange(
																Number.parseInt(e.target.value, 10),
															)
														}
													/>
												</FormControl>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("store_admin_rsvp_cancel_hours_descr")}
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="showCostToCustomer"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
												<FormLabel>{t("store_admin_rsvp_show_cost")}</FormLabel>
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
									{rsvpModeWatched === RsvpMode.FACILITY && (
										<FormField
											control={form.control}
											name="mustSelectFacility"
											render={({ field }) => (
												<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
													<FormLabel>
														{t("store_admin_rsvp_must_facility")}
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
									)}
									{rsvpModeWatched === RsvpMode.FACILITY && (
										<FormField
											control={form.control}
											name="mustHaveServiceStaff"
											render={({ field }) => (
												<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
													<FormLabel>
														{t("store_admin_rsvp_must_staff")}
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
									)}
									<FormField
										control={form.control}
										name="reminderHours"
										render={({ field }) => (
											<FormItem className="sm:col-span-2">
												<FormLabel>
													{t("store_admin_rsvp_reminder_hours")}
												</FormLabel>

												<FormControl>
													<Input
														type="number"
														min={0}
														disabled={submitting}
														{...field}
														onChange={(e) =>
															field.onChange(
																Number.parseInt(e.target.value, 10),
															)
														}
													/>
												</FormControl>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("store_admin_rsvp_reminder_hours_descr")}
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="confirmHours"
										render={({ field }) => (
											<FormItem className="sm:col-span-2">
												<FormLabel>
													{t("store_admin_rsvp_confirm_hours")}
												</FormLabel>

												<FormControl>
													<Input
														type="number"
														min={1}
														disabled={submitting}
														{...field}
														onChange={(e) =>
															field.onChange(
																Number.parseInt(e.target.value, 10),
															)
														}
													/>
												</FormControl>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("store_admin_rsvp_confirm_hours_descr")}
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
								</CardContent>
							</Card>
						</AdminSettingsTabsContent>

						<AdminSettingsTabsContent value="hours" className="space-y-4">
							<Card>
								<CardContent className="space-y-4 gap-4">
									<FormField
										control={form.control}
										name="canReserveBefore"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{t("store_admin_rsvp_can_reserve_before")}
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														min={0}
														disabled={submitting}
														{...field}
														onChange={(e) =>
															field.onChange(
																Number.parseInt(e.target.value, 10),
															)
														}
													/>
												</FormControl>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("store_admin_rsvp_can_reserve_before_descr")}
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="canReserveAfter"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{t("store_admin_rsvp_can_reserve_after")}
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														min={0}
														disabled={submitting}
														{...field}
														onChange={(e) =>
															field.onChange(
																Number.parseInt(e.target.value, 10),
															)
														}
													/>
												</FormControl>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("store_admin_rsvp_can_reserve_after_descr")}
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="useBusinessHours"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
												<div>
													<FormLabel>
														{t("store_admin_rsvp_use_store_hours")}
													</FormLabel>
												</div>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
														disabled={submitting}
													/>
												</FormControl>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("store_admin_rsvp_use_store_hours_descr")}
												</FormDescription>

												<FormMessage />
											</FormItem>
										)}
									/>
									{!useBh && (
										<FormField
											control={form.control}
											name="rsvpHours"
											render={({ field, fieldState }) => (
												<FormItem
													className={cn(
														fieldState.error &&
															"rounded-md border border-destructive/50 bg-destructive/5 p-2",
													)}
												>
													<FormLabel>
														{t("store_admin_rsvp_custom_hours_json")}
													</FormLabel>
													<FormControl>
														<BusinessHoursEditor
															disabled={submitting}
															value={field.value ?? ""}
															onChange={(value) =>
																field.onChange(value === "" ? null : value)
															}
															defaultTimezone={storeDefaultTimezone}
														/>
													</FormControl>
													<FormDescription className="text-xs font-mono text-gray-500">
														{t("store_admin_rsvp_custom_hours_json_descr")}
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
									)}
									<FormField
										control={form.control}
										name="syncWithGoogle"
										render={({ field }) => (
											<FormItem className="space-y-3 rounded-lg border p-3">
												<div className="flex flex-row items-start justify-between gap-3">
													<div className="min-w-0 flex-1 space-y-1">
														<FormLabel>
															{t("store_admin_rsvp_sync_google")}
														</FormLabel>
													</div>
													<FormControl>
														<Switch
															checked={field.value}
															onCheckedChange={(checked) => {
																const next = checked === true;
																const previous = field.value ?? false;
																field.onChange(next);
																void persistSyncWithGoogle(next, previous);
															}}
															disabled={
																submitting ||
																syncWithGoogleSaving ||
																googleCalendarLinking
															}
															className="touch-manipulation"
														/>
													</FormControl>
												</div>

												<FormDescription className="text-xs font-mono text-gray-500">
													{t("store_admin_rsvp_sync_google_descr")}
												</FormDescription>
												<FormMessage />
												{field.value ? (
													<div className="space-y-3 border-t border-border pt-3">
														{gcalUiLoading ? (
															<div className="text-muted-foreground flex items-center gap-2 text-sm">
																<Loader />
																{t(
																	"store_settings_google_calendar_loading_calendars",
																)}
															</div>
														) : null}
														{!gcalUiLoading && !gcalConnected ? (
															<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
																<p className="text-muted-foreground text-xs sm:text-sm">
																	{gcalNeedsReconnect
																		? t(
																				"store_settings_google_calendar_invalid",
																			)
																		: t("store_settings_google_calendar_descr")}
																</p>
																<Button
																	type="button"
																	variant="outline"
																	size="sm"
																	className="h-10 shrink-0 touch-manipulation sm:h-9 sm:min-h-0"
																	disabled={gcalActionsDisabled}
																	onClick={() =>
																		void handleRequestGoogleCalendarAccess()
																	}
																>
																	{gcalNeedsReconnect
																		? t(
																				"store_settings_google_calendar_reconnect",
																			)
																		: t(
																				"store_settings_google_calendar_connect",
																			)}
																</Button>
															</div>
														) : null}
														{!gcalUiLoading &&
														gcalConnected &&
														gcalListLoading ? (
															<div className="text-muted-foreground flex items-center gap-2 text-sm">
																<Loader />
																{t(
																	"store_settings_google_calendar_loading_calendars",
																)}
															</div>
														) : null}
														{!gcalUiLoading &&
														gcalConnected &&
														!gcalListLoading &&
														gcalListError ? (
															<div className="space-y-3">
																<p className="text-destructive text-sm">
																	{googleCalendarListErrorDescription(
																		gcalListError,
																		t,
																	)}
																</p>
																<Button
																	type="button"
																	variant="outline"
																	size="sm"
																	className="h-10 touch-manipulation sm:h-9 sm:min-h-0"
																	disabled={gcalActionsDisabled}
																	onClick={() =>
																		void handleRequestGoogleCalendarAccess()
																	}
																>
																	{t(
																		"store_settings_google_calendar_reconnect",
																	)}
																</Button>
															</div>
														) : null}
														{!gcalUiLoading &&
														gcalConnected &&
														!gcalListLoading &&
														!gcalListError &&
														gcalCalendars.length > 0 ? (
															<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
																<div className="min-w-0 flex-1 space-y-1">
																	<div className="text-sm font-medium">
																		{t(
																			"store_settings_google_calendar_sync_calendar_label",
																		)}
																	</div>
																	<FormDescription className="text-xs font-mono text-gray-500">
																		{t(
																			"store_settings_google_calendar_sync_calendar_descr",
																		)}
																	</FormDescription>
																</div>
																<Select
																	value={googleCalendarSelectValue}
																	onValueChange={(value) => {
																		void handleGoogleCalendarSelect(value);
																	}}
																	disabled={gcalActionsDisabled}
																>
																	<SelectTrigger className="h-10 w-full min-w-[200px] touch-manipulation sm:h-9 sm:w-[280px]">
																		<SelectValue
																			placeholder={t(
																				"store_settings_google_calendar_choose_placeholder",
																			)}
																		/>
																	</SelectTrigger>
																	<SelectContent>
																		<SelectItem value="--">
																			{t(
																				"store_settings_google_calendar_choose_placeholder",
																			)}
																		</SelectItem>
																		{gcalCalendars.map((cal) => (
																			<SelectItem key={cal.id} value={cal.id}>
																				{cal.summary}
																				{cal.primary
																					? ` (${t(
																							"store_settings_google_calendar_primary_alias",
																						)})`
																					: ""}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															</div>
														) : null}
														{!gcalUiLoading &&
														gcalConnected &&
														!gcalListLoading &&
														!gcalListError &&
														gcalCalendars.length === 0 ? (
															<div className="space-y-3">
																<p className="text-muted-foreground text-sm">
																	{t("store_settings_google_calendar_descr")}
																</p>
																<Button
																	type="button"
																	variant="outline"
																	size="sm"
																	className="h-10 touch-manipulation sm:h-9 sm:min-h-0"
																	disabled={gcalActionsDisabled}
																	onClick={() =>
																		void handleRequestGoogleCalendarAccess()
																	}
																>
																	{t(
																		"store_settings_google_calendar_reconnect",
																	)}
																</Button>
															</div>
														) : null}
													</div>
												) : null}
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="syncWithApple"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
												<FormLabel>
													{t("store_admin_rsvp_sync_apple")}
												</FormLabel>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
														disabled={submitting}
													/>
												</FormControl>
											</FormItem>
										)}
									/>
								</CardContent>
							</Card>
						</AdminSettingsTabsContent>

						{activeTab !== "blacklist" ? (
							<AdminSettingsTabFormFooter>
								<Button
									type="submit"
									disabled={submitting || !form.formState.isValid}
									className="touch-manipulation"
								>
									{t("save")}
								</Button>
							</AdminSettingsTabFormFooter>
						) : null}
					</form>
				</Form>

				<AdminSettingsTabsContent value="blacklist" className="space-y-4">
					<RsvpBlacklistTable
						storeId={storeId}
						rows={blacklist}
						onRowsChange={setBlacklist}
					/>
				</AdminSettingsTabsContent>
			</AdminSettingsTabs>
		</div>
	);
}
