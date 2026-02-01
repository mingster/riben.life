"use client";

import { checkInReservationAction } from "@/actions/store/reservation/check-in-reservation";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Container from "@/components/ui/container";
import { IconCheck, IconQrcode } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";

interface CheckinClientProps {
	storeId: string;
	storeName: string;
	initialRsvpId: string | null;
}

export function CheckinClient({
	storeId,
	storeName,
	initialRsvpId,
}: CheckinClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [code, setCode] = useState(initialRsvpId ?? "");
	const [status, setStatus] = useState<
		"idle" | "loading" | "success" | "already" | "error"
	>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const doCheckIn = useCallback(
		async (rsvpId: string) => {
			if (!rsvpId.trim()) return;
			setStatus("loading");
			setErrorMessage(null);
			const result = await checkInReservationAction({
				storeId,
				rsvpId: rsvpId.trim(),
			});
			if (result?.serverError) {
				setStatus("error");
				setErrorMessage(result.serverError);
				return;
			}
			if (result?.data?.alreadyCheckedIn) {
				setStatus("already");
			} else {
				setStatus("success");
			}
		},
		[storeId],
	);

	// Auto check-in when rsvpId is in URL (e.g. from QR)
	useEffect(() => {
		if (initialRsvpId && status === "idle") {
			doCheckIn(initialRsvpId);
		}
	}, [initialRsvpId, doCheckIn]); // eslint-disable-line react-hooks/exhaustive-deps -- run once when initialRsvpId is set

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		doCheckIn(code);
	};

	return (
		<Container className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-3 sm:px-4 lg:px-6 py-8">
			<div className="w-full max-w-md space-y-6 text-center">
				<div className="space-y-1">
					<h1 className="text-xl sm:text-2xl font-semibold">
						{t("rsvp_checkin_title") || "Reservation Check-in"}
					</h1>
					<p className="text-sm text-muted-foreground">{storeName}</p>
				</div>

				{status === "loading" && (
					<p className="text-sm text-muted-foreground">
						{t("rsvp_checkin_processing") || "Processing..."}
					</p>
				)}

				{status === "success" && (
					<div className="rounded-lg border border-green-500/50 bg-green-500/10 p-6 flex flex-col items-center gap-3">
						<IconCheck className="h-12 w-12 text-green-600" />
						<p className="font-medium text-green-700 dark:text-green-400">
							{t("rsvp_checkin_success") || "You're checked in!"}
						</p>
						<p className="text-sm text-muted-foreground">
							{t("rsvp_checkin_success_hint") ||
								"Please proceed. Staff have been notified."}
						</p>
					</div>
				)}

				{status === "already" && (
					<div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-6 flex flex-col items-center gap-3">
						<IconCheck className="h-12 w-12 text-blue-600" />
						<p className="font-medium text-blue-700 dark:text-blue-400">
							{t("rsvp_checkin_already") || "Already checked in"}
						</p>
						<p className="text-sm text-muted-foreground">
							{t("rsvp_checkin_already_hint") || "You were already checked in."}
						</p>
					</div>
				)}

				{status === "error" && (
					<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
						<p className="text-sm text-destructive">
							{errorMessage ||
								t("rsvp_checkin_error") ||
								"Check-in failed. Please try again."}
						</p>
					</div>
				)}

				{(status === "idle" || status === "error" || !initialRsvpId) && (
					<form onSubmit={handleSubmit} className="space-y-4 text-left">
						<div className="space-y-2">
							<Label htmlFor="rsvp-code">
								{t("rsvp_checkin_code_label") || "Reservation code"}
							</Label>
							<Input
								id="rsvp-code"
								type="text"
								placeholder={
									t("rsvp_checkin_code_placeholder") || "Enter reservation ID"
								}
								value={code}
								onChange={(e) => setCode(e.target.value)}
								className="h-10 text-base sm:text-sm touch-manipulation"
								autoComplete="off"
							/>
						</div>
						<Button
							type="submit"
							className="w-full h-10 sm:h-9 touch-manipulation"
							disabled={!code.trim() || status === "loading"}
						>
							<IconQrcode className="mr-2 h-4 w-4" />
							{t("rsvp_checkin_submit") || "Check in"}
						</Button>
					</form>
				)}
			</div>
		</Container>
	);
}
