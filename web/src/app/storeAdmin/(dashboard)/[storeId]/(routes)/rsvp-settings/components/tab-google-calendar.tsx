"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { useTranslation } from "@/app/i18n/client";
import { disconnectGoogleCalendarAction } from "@/actions/storeAdmin/google-calendar/disconnect-google-calendar";
import { getMyGoogleCalendarConnectionAction } from "@/actions/storeAdmin/google-calendar/get-my-google-calendar-connection";
import { Loader } from "@/components/loader";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useI18n } from "@/providers/i18n-provider";

/**
 * Per-user Google Calendar connection for RSVP sync
 * (assigned staff or store owner fallback).
 */
export function RsvpGoogleCalendarTab() {
	const params = useParams();
	const searchParams = useSearchParams();
	const storeId = String(params.storeId ?? "");
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [loading, setLoading] = useState(true);
	const [disconnecting, setDisconnecting] = useState(false);
	const [connected, setConnected] = useState(false);
	const [calendarId, setCalendarId] = useState<string | null>(null);
	const [needsReconnect, setNeedsReconnect] = useState(false);

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

	useEffect(() => {
		void refreshStatus();
	}, [refreshStatus]);

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
		} finally {
			setDisconnecting(false);
		}
	};

	if (loading) {
		return (
			<div className="flex justify-center py-12">
				<Loader />
			</div>
		);
	}

	return (
		<Card className="mt-4">
			<CardHeader>
				<CardTitle>{t("store_settings_google_calendar_title")}</CardTitle>
				<CardDescription className="text-xs font-mono text-gray-500">
					{t("store_settings_google_calendar_descr")}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-sm text-muted-foreground">
					{t("store_settings_google_calendar_how_it_works")}
				</p>

				{needsReconnect && (
					<p className="text-sm text-destructive">
						{t("store_settings_google_calendar_invalid")}
					</p>
				)}

				<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
					{connected ? (
						<>
							<p className="text-sm">
								<span className="font-medium">
									{t("store_settings_google_calendar_status_connected")}
								</span>
								{calendarId ? (
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
					) : (
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
					)}
				</div>
			</CardContent>
		</Card>
	);
}
