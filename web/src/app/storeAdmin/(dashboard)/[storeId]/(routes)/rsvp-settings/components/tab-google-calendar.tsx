"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { useTranslation } from "@/app/i18n/client";
import { updateRsvpSettingsAction } from "@/actions/storeAdmin/rsvpSettings/update-rsvp-settings";
import { disconnectGoogleCalendarAction } from "@/actions/storeAdmin/google-calendar/disconnect-google-calendar";
import { getMyGoogleCalendarConnectionAction } from "@/actions/storeAdmin/google-calendar/get-my-google-calendar-connection";
import { listGoogleCalendarCalendarsAction } from "@/actions/storeAdmin/google-calendar/list-google-calendar-calendars";
import { updateGoogleCalendarConnectionCalendarAction } from "@/actions/storeAdmin/google-calendar/update-google-calendar-connection-calendar";
import type { WritableGoogleCalendarOption } from "@/lib/google-calendar/list-writable-google-calendars";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/loader";
import { toastError, toastSuccess } from "@/components/toaster";
import { ClipLoader } from "react-spinners";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/providers/i18n-provider";
import { epochToDate } from "@/utils/datetime-utils";
import Link from "next/link";

import type { RsvpSettingsData } from "./tabs";

export interface RsvpGoogleCalendarTabProps {
	rsvpSettings?: RsvpSettingsData | null;
	onRsvpSettingsUpdated?: (updated: RsvpSettingsData) => void;
}

/**
 * Per-user Google Calendar connection for RSVP sync
 * (assigned staff or store owner fallback).
 */
export function RsvpGoogleCalendarTab({
	rsvpSettings,
	onRsvpSettingsUpdated,
}: RsvpGoogleCalendarTabProps) {
	const params = useParams();
	const searchParams = useSearchParams();
	const storeId = String(params.storeId ?? "");
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [loading, setLoading] = useState(true);
	const [disconnecting, setDisconnecting] = useState(false);
	const [savingCalendar, setSavingCalendar] = useState(false);
	const [connected, setConnected] = useState(false);
	const [calendarId, setCalendarId] = useState<string | null>(null);
	const [needsReconnect, setNeedsReconnect] = useState(false);
	const [calendarOptions, setCalendarOptions] = useState<
		WritableGoogleCalendarOption[]
	>([]);
	const [listCalendarsLoading, setListCalendarsLoading] = useState(false);
	const [listError, setListError] = useState<
		"list_failed" | "unauthorized" | "calendar_not_signed_up" | null
	>(null);
	const [syncGoogleSaving, setSyncGoogleSaving] = useState(false);

	const onSyncWithGoogleChange = useCallback(
		async (checked: boolean) => {
			if (!storeId) {
				return;
			}
			setSyncGoogleSaving(true);
			try {
				const result = await updateRsvpSettingsAction(storeId, {
					syncWithGoogle: checked,
				});
				if (result?.serverError) {
					toastError({ description: result.serverError });
					return;
				}
				if (result?.data?.rsvpSettings && onRsvpSettingsUpdated) {
					const rs = result.data.rsvpSettings;
					onRsvpSettingsUpdated({
						...rs,
						minPrepaidPercentage: rs.minPrepaidPercentage ?? 100,
						createdAt: epochToDate(rs.createdAt) ?? new Date(),
						updatedAt: epochToDate(rs.updatedAt) ?? new Date(),
					});
				}
				toastSuccess({
					title: t("store_updated"),
					description: "",
				});
			} finally {
				setSyncGoogleSaving(false);
			}
		},
		[storeId, onRsvpSettingsUpdated, t],
	);

	const refreshStatus = useCallback(async () => {
		if (!storeId) {
			return;
		}
		setLoading(true);
		try {
			const result = await getMyGoogleCalendarConnectionAction(storeId, {});
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			if (result?.data) {
				setConnected(result.data.connected);
				setCalendarId(result.data.googleCalendarId);
				setNeedsReconnect(result.data.isInvalid);
			}
		} finally {
			setLoading(false);
		}
	}, [storeId]);

	const loadCalendars = useCallback(async () => {
		if (!storeId) {
			return;
		}
		setListCalendarsLoading(true);
		setListError(null);
		try {
			const result = await listGoogleCalendarCalendarsAction(storeId, {});
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			if (result?.data) {
				setCalendarOptions(result.data.calendars);
				setListError(result.data.listError);
			}
		} finally {
			setListCalendarsLoading(false);
		}
	}, [storeId]);

	useEffect(() => {
		void refreshStatus();
	}, [refreshStatus]);

	useEffect(() => {
		if (connected && !needsReconnect) {
			void loadCalendars();
		} else {
			setCalendarOptions([]);
			setListError(null);
		}
	}, [connected, needsReconnect, loadCalendars]);

	useEffect(() => {
		const gc = searchParams.get("gc");
		if (!gc) {
			return;
		}
		if (gc === "connected") {
			toastSuccess({
				description: t("store_settings_google_calendar_connected"),
			});
			void refreshStatus();
		} else if (gc === "error" || gc === "token_error") {
			toastError({
				description: t("store_settings_google_calendar_oauth_error"),
			});
		} else if (gc === "no_refresh") {
			toastError({
				description: t("store_settings_google_calendar_no_refresh"),
			});
		}
	}, [searchParams, t, refreshStatus]);

	const selectOptions = useMemo(() => {
		const base = [...calendarOptions];
		if (!calendarId) {
			return base;
		}
		if (calendarId === "primary") {
			return base;
		}
		if (base.some((c) => c.id === calendarId)) {
			return base;
		}
		return [
			...base,
			{
				id: calendarId,
				summary: calendarId,
				primary: false,
			},
		];
	}, [calendarOptions, calendarId]);

	const selectValue = useMemo(() => {
		if (!calendarId) {
			return "";
		}
		if (calendarId === "primary") {
			const primary = selectOptions.find((c) => c.primary);
			return primary?.id ?? "primary";
		}
		return calendarId;
	}, [calendarId, selectOptions]);

	const needsPrimaryAliasItem =
		calendarId === "primary" && !selectOptions.some((c) => c.primary);

	const startUrl = `/api/storeAdmin/${storeId}/google-calendar/oauth/start`;

	const onDisconnect = async () => {
		setDisconnecting(true);
		try {
			const result = await disconnectGoogleCalendarAction(storeId, {});
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			toastSuccess({
				description: t("store_settings_google_calendar_disconnected"),
			});
			setConnected(false);
			setCalendarId(null);
			setNeedsReconnect(false);
			setCalendarOptions([]);
			setListError(null);
		} finally {
			setDisconnecting(false);
		}
	};

	const onCalendarChange = async (value: string) => {
		setSavingCalendar(true);
		try {
			const result = await updateGoogleCalendarConnectionCalendarAction(
				storeId,
				{ googleCalendarId: value },
			);
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			if (result?.data?.googleCalendarId) {
				setCalendarId(result.data.googleCalendarId);
			}
			toastSuccess({
				description: t("store_settings_google_calendar_calendar_updated"),
			});
		} finally {
			setSavingCalendar(false);
		}
	};

	if (loading) {
		return (
			<div className="flex justify-center py-12">
				<Loader />
			</div>
		);
	}

	const googleSyncEnabled = rsvpSettings?.syncWithGoogle ?? false;

	return (
		<Card className="mt-4">
			<CardHeader>
				<CardTitle>{t("store_settings_google_calendar_title")}</CardTitle>
				<CardDescription className="text-xs font-mono text-gray-500">
					{t("store_settings_google_calendar_descr")}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
					<Label htmlFor="rsvp-sync-with-google" className="text-base pr-3">
						{t("rsvp_Sync_Google")}
					</Label>
					<Switch
						id="rsvp-sync-with-google"
						checked={rsvpSettings?.syncWithGoogle ?? false}
						disabled={syncGoogleSaving}
						onCheckedChange={(value) => void onSyncWithGoogleChange(value)}
						className="touch-manipulation"
					/>
				</div>

				<p className="text-sm text-muted-foreground">
					{t("store_settings_google_calendar_how_it_works")}
				</p>

				{needsReconnect && (
					<p className="text-sm text-destructive">
						{t("store_settings_google_calendar_invalid")}
					</p>
				)}

				<div
					className={cn(
						"flex flex-col gap-2 sm:flex-row sm:items-center",
						!connected && !googleSyncEnabled && "opacity-50",
					)}
				>
					{connected ? (
						<>
							<p className="text-sm">
								<span className="font-medium">
									{t("store_settings_google_calendar_status_connected")}
								</span>
								{calendarId && (listError !== null || listCalendarsLoading) ? (
									<span className="ml-2 text-muted-foreground">
										({calendarId})
									</span>
								) : null}
							</p>
							<Button
								type="button"
								variant="outline"
								className="touch-manipulation sm:ml-2"
								disabled={disconnecting}
								onClick={() => void onDisconnect()}
							>
								{disconnecting
									? t("store_settings_google_calendar_disconnecting")
									: t("store_settings_google_calendar_disconnect")}
							</Button>
						</>
					) : googleSyncEnabled ? (
						<Button
							type="button"
							className="touch-manipulation w-full sm:w-auto"
							asChild
						>
							<a href={startUrl}>
								{needsReconnect
									? t("store_settings_google_calendar_reconnect")
									: t("store_settings_google_calendar_connect")}
							</a>
						</Button>
					) : (
						<Button
							type="button"
							className="touch-manipulation w-full sm:w-auto"
							disabled
						>
							{needsReconnect
								? t("store_settings_google_calendar_reconnect")
								: t("store_settings_google_calendar_connect")}
						</Button>
					)}
				</div>

				{!googleSyncEnabled && !connected && (
					<p className="text-xs font-mono text-gray-500">
						{t("store_settings_google_calendar_enable_sync_hint")}
					</p>
				)}

				{connected && !needsReconnect && googleSyncEnabled && (
					<div className="space-y-2">
						<Label htmlFor="google-calendar-sync-target">
							{t("store_settings_google_calendar_sync_calendar_label")}
						</Label>
						{listCalendarsLoading ? (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<ClipLoader size={20} color="#737373" />
								<span>
									{t("store_settings_google_calendar_loading_calendars")}
								</span>
							</div>
						) : listError === "calendar_not_signed_up" ? (
							<p className="text-sm text-destructive">
								{t("store_settings_google_calendar_not_signed_up")}
							</p>
						) : listError === "list_failed" || listError === "unauthorized" ? (
							<p className="text-sm text-destructive">
								{t("store_settings_google_calendar_list_failed")}
							</p>
						) : (
							<Select
								value={selectValue}
								onValueChange={(value) => void onCalendarChange(value)}
								disabled={savingCalendar || selectOptions.length === 0}
							>
								<SelectTrigger
									id="google-calendar-sync-target"
									className="h-10 w-full max-w-md text-base sm:h-9 sm:text-sm touch-manipulation"
								>
									<SelectValue
										placeholder={t(
											"store_settings_google_calendar_sync_calendar_label",
										)}
									/>
								</SelectTrigger>
								<SelectContent>
									{needsPrimaryAliasItem ? (
										<SelectItem value="primary">
											{t("store_settings_google_calendar_primary_alias")}
										</SelectItem>
									) : null}
									{selectOptions.map((cal) => (
										<SelectItem key={cal.id} value={cal.id}>
											{cal.primary
												? `${cal.summary} (${t("store_settings_google_calendar_primary_alias")})`
												: cal.summary}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
						<p className="text-xs font-mono text-gray-500">
							{t("store_settings_google_calendar_sync_calendar_descr")}
						</p>

						<Link
							href="https://calendar.google.com"
							target="_blank"
							rel="noopener noreferrer"
							className="text-xs font-mono text-gray-500"
						>
							https://calendar.google.com
						</Link>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
