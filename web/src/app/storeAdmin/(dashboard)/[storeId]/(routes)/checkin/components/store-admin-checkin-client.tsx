"use client";

import { checkInRsvpAction } from "@/actions/storeAdmin/rsvp/check-in-rsvp";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconCheck, IconQrcode } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	isCheckInCodeInput,
	parseScannedCheckInValue,
} from "@/utils/check-in-code";
import { Html5Qrcode } from "html5-qrcode";

interface StoreAdminCheckinClientProps {
	storeId: string;
	storeName: string;
}

export function StoreAdminCheckinClient({
	storeId,
	storeName,
}: StoreAdminCheckinClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [code, setCode] = useState("");
	const [status, setStatus] = useState<
		"idle" | "loading" | "success" | "already" | "error"
	>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [guestName, setGuestName] = useState<string | null>(null);
	const [isScanning, setIsScanning] = useState(false);
	const scannerRef = useRef<Html5Qrcode | null>(null);
	const scanTargetId = "store-admin-checkin-qr-reader";

	const doCheckIn = useCallback(
		async (input: string) => {
			const trimmed = input.trim();
			if (!trimmed) return;
			setStatus("loading");
			setErrorMessage(null);
			setGuestName(null);
			const payload = isCheckInCodeInput(trimmed)
				? { checkInCode: trimmed }
				: { rsvpId: trimmed };
			const result = await checkInRsvpAction(storeId, payload);
			if (result?.serverError) {
				setStatus("error");
				setErrorMessage(result.serverError);
				return;
			}
			const name =
				result?.data?.rsvp?.Customer?.name ?? result?.data?.rsvp?.name ?? null;
			setGuestName(name ?? null);
			if (result?.data?.alreadyCheckedIn) {
				setStatus("already");
			} else {
				setStatus("success");
			}
		},
		[storeId],
	);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		doCheckIn(code);
	};

	const handleScanSuccess = useCallback(
		(decodedText: string) => {
			const parsed = parseScannedCheckInValue(decodedText);
			if (parsed) {
				setIsScanning(false);
				doCheckIn(parsed);
			}
		},
		[doCheckIn],
	);

	const startScanner = useCallback(() => {
		setIsScanning(true);
	}, []);

	const stopScanner = useCallback(() => {
		setIsScanning(false);
	}, []);

	// Start/stop QR scanner when isScanning changes
	useEffect(() => {
		if (!isScanning) {
			if (scannerRef.current) {
				scannerRef.current
					.stop()
					.then(() => {
						scannerRef.current?.clear();
						scannerRef.current = null;
					})
					.catch(() => {
						scannerRef.current = null;
					});
			}
			return;
		}
		const html5Qr = new Html5Qrcode(scanTargetId);
		scannerRef.current = html5Qr;
		const config = {
			fps: 10,
			qrbox: { width: 250, height: 250 },
			aspectRatio: 1,
		};
		html5Qr
			.start(
				{ facingMode: "environment" },
				config,
				(decodedText) => handleScanSuccess(decodedText),
				() => {},
			)
			.catch((err: unknown) => {
				scannerRef.current = null;
				setIsScanning(false);
				setStatus("error");
				setErrorMessage(err instanceof Error ? err.message : String(err));
			});
		return () => {
			if (scannerRef.current) {
				scannerRef.current
					.stop()
					.then(() => {
						scannerRef.current?.clear();
						scannerRef.current = null;
					})
					.catch(() => {
						scannerRef.current = null;
					});
			}
		};
	}, [isScanning, handleScanSuccess]);

	const resetAndEnterNext = () => {
		setStatus("idle");
		setErrorMessage(null);
		setGuestName(null);
		setCode("");
	};

	return (
		<div className="flex flex-col gap-6 py-4">
			<div className="space-y-1">
				<h1 className="text-xl sm:text-2xl font-semibold">
					{t("rsvp_checkin_staff_title") || "Check-in (Staff)"}
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
						{t("rsvp_checkin_staff_success") || "Checked in!"}
					</p>
					{guestName && (
						<p className="text-sm text-muted-foreground">{guestName}</p>
					)}
					<Button
						variant="outline"
						size="sm"
						onClick={resetAndEnterNext}
						className="mt-2 h-10 sm:h-9 touch-manipulation"
					>
						{t("rsvp_checkin_scan_again") || "Enter next code"}
					</Button>
				</div>
			)}

			{status === "already" && (
				<div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-6 flex flex-col items-center gap-3">
					<IconCheck className="h-12 w-12 text-blue-600" />
					<p className="font-medium text-blue-700 dark:text-blue-400">
						{t("rsvp_checkin_already") || "Already checked in"}
					</p>
					{guestName && (
						<p className="text-sm text-muted-foreground">{guestName}</p>
					)}
					<Button
						variant="outline"
						size="sm"
						onClick={resetAndEnterNext}
						className="mt-2 h-10 sm:h-9 touch-manipulation"
					>
						{t("rsvp_checkin_scan_again") || "Enter next code"}
					</Button>
				</div>
			)}

			{status === "error" && (
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex flex-col gap-2">
					<p className="text-sm text-destructive">
						{errorMessage ??
							t("rsvp_checkin_error") ??
							"Check-in failed. Please try again."}
					</p>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							setStatus("idle");
							setErrorMessage(null);
						}}
						className="h-10 sm:h-9 touch-manipulation"
					>
						{t("rsvp_checkin_try_again") || "Try again"}
					</Button>
				</div>
			)}

			{(status === "idle" || status === "success" || status === "already") && (
				<>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="store-checkin-code">
								{t("rsvp_checkin_code_label") || "Check-in code"}
							</Label>
							<p className="text-xs text-muted-foreground">
								{t("rsvp_checkin_code_hint") ||
									"Enter the 8-digit code shown on the customer's reservation or pass."}
							</p>
							<div className="flex gap-2">
								<Input
									id="store-checkin-code"
									type="text"
									inputMode="numeric"
									placeholder={t("rsvp_checkin_code_placeholder") || "12345678"}
									value={code}
									onChange={(e) => setCode(e.target.value)}
									className="h-10 text-base sm:text-sm touch-manipulation flex-1 font-mono"
									autoComplete="off"
								/>
								<Button
									type="submit"
									className="h-10 sm:h-9 touch-manipulation"
									disabled={!code.trim()}
								>
									{t("rsvp_checkin_submit") || "Check in"}
								</Button>
							</div>
						</div>
					</form>

					<div className="space-y-2">
						<p className="text-sm text-muted-foreground">
							{t("rsvp_checkin_or_scan") || "Or scan QR code"}
						</p>
						{!isScanning ? (
							<Button
								type="button"
								variant="outline"
								onClick={startScanner}
								className="h-10 sm:h-9 touch-manipulation"
							>
								<IconQrcode className="mr-2 h-4 w-4" />
								{t("rsvp_checkin_scan_qr") || "Scan QR code"}
							</Button>
						) : (
							<div className="space-y-2">
								<div
									id={scanTargetId}
									className="rounded-lg border bg-muted/50 overflow-hidden max-w-[280px] mx-auto"
								/>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={stopScanner}
									className="h-10 sm:h-9 touch-manipulation"
								>
									{t("rsvp_checkin_stop_scan") || "Stop camera"}
								</Button>
							</div>
						)}
					</div>
				</>
			)}
		</div>
	);
}
