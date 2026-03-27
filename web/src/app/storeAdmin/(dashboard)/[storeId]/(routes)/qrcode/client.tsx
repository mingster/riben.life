"use client";

import { useState } from "react";
import type { Store } from "@/types";
import { getAbsoluteUrl } from "@/utils/utils";
import type { StoreFacility } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { useQRCode } from "next-qrcode";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import Link from "next/link";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface props {
	store: Store;
	facilities: StoreFacility[];
}

// display QR code for store's ordering URL, reservation URL, and facility ordering URL
export const QrCodeClient: React.FC<props> = ({ store, facilities }) => {
	const { Image } = useQRCode();
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");
	const [isExportingPdf, setIsExportingPdf] = useState(false);

	// Build base URL
	const getBaseUrl = () => {
		if (store.customDomain) {
			const port =
				typeof window !== "undefined" && window.location.port
					? window.location.port
					: "";

			const protocol =
				typeof window !== "undefined" && window.location.protocol
					? `${window.location.protocol}//`
					: "https://";

			let url = protocol + store.customDomain;
			if (port && port !== "80" && port !== "443") {
				url = `${url}:${port}`;
			}
			return url;
		}
		return getAbsoluteUrl();
	};

	const baseUrl = getBaseUrl();
	const orderingUrl = `${baseUrl}/s/${store.id}`;
	const reservationUrl = `${baseUrl}/s/${store.id}/reservation`;
	const waitingListUrl = `${baseUrl}/s/${store.id}/waitlist`;
	const liffUrl = `${baseUrl}/liff/${store.id}`;
	const qrItems: Array<{ title: string; url: string }> = [
		{
			title: t("qr_code_ordering_URL") || "Ordering URL",
			url: orderingUrl,
		},
		{
			title: t("qr_code_reservation_URL") || "Reservation URL",
			url: reservationUrl,
		},
		{
			title: t("qr_code_waiting_list_URL") || "Waiting List URL",
			url: waitingListUrl,
		},
		{
			title: t("qr_code_liff_URL") || "LIFF URL",
			url: liffUrl,
		},
		...facilities.map((facility) => ({
			title: facility.facilityName,
			url: `${baseUrl}/s/${store.id}/${facility.id}`,
		})),
	];

	const createTitleImageDataUrl = (title: string): string => {
		const canvas = document.createElement("canvas");
		const widthPx = 420;
		const heightPx = 120;
		canvas.width = widthPx;
		canvas.height = heightPx;

		const ctx = canvas.getContext("2d");
		if (!ctx) {
			return "";
		}

		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, widthPx, heightPx);
		ctx.fillStyle = "#111111";
		ctx.font =
			'500 30px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Noto Sans TC", "Noto Sans JP", sans-serif';
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		const maxCharsPerLine = 10;
		const rawChars = Array.from(title.trim());
		const lines: string[] = [];
		for (
			let index = 0;
			index < rawChars.length && lines.length < 2;
			index += maxCharsPerLine
		) {
			lines.push(rawChars.slice(index, index + maxCharsPerLine).join(""));
		}
		const visibleLines = lines.length > 0 ? lines : [title];
		const lineHeightPx = 34;
		const firstLineYPx = visibleLines.length === 1 ? 60 : 45;

		visibleLines.forEach((line, index) => {
			ctx.fillText(line, widthPx / 2, firstLineYPx + index * lineHeightPx);
		});

		return canvas.toDataURL("image/png");
	};

	const handleExportPdf = async () => {
		setIsExportingPdf(true);
		try {
			const pdf = new jsPDF({
				orientation: "portrait",
				unit: "mm",
				format: "a4",
			});

			const pageWidth = pdf.internal.pageSize.getWidth();
			const pageHeight = pdf.internal.pageSize.getHeight();
			const marginMm = 10;
			const qrSizeMm = 30; // 3cm
			const colGapMm = 8;
			const rowGapMm = 10;
			const labelHeightMm = 8;
			const cellHeightMm = qrSizeMm + labelHeightMm;
			const contentWidth = pageWidth - marginMm * 2;
			const columns = Math.max(
				1,
				Math.floor((contentWidth + colGapMm) / (qrSizeMm + colGapMm)),
			);
			const rowsPerPage = Math.max(
				1,
				Math.floor(
					(pageHeight - marginMm * 2 + rowGapMm) / (cellHeightMm + rowGapMm),
				),
			);
			const itemsPerPage = columns * rowsPerPage;

			for (let index = 0; index < qrItems.length; index += 1) {
				const item = qrItems[index];
				const pageIndex = Math.floor(index / itemsPerPage);
				const indexInPage = index % itemsPerPage;
				const row = Math.floor(indexInPage / columns);
				const col = indexInPage % columns;
				const x = marginMm + col * (qrSizeMm + colGapMm);
				const y = marginMm + row * (cellHeightMm + rowGapMm);

				if (pageIndex > 0 && indexInPage === 0) {
					pdf.addPage();
				}

				const qrDataUrl = await QRCode.toDataURL(item.url, {
					errorCorrectionLevel: "H",
					margin: 1,
					width: 512,
				});

				pdf.addImage(
					qrDataUrl,
					"PNG",
					x,
					y,
					qrSizeMm,
					qrSizeMm,
					undefined,
					"FAST",
				);

				const titleImageDataUrl = createTitleImageDataUrl(item.title);
				if (titleImageDataUrl) {
					pdf.addImage(
						titleImageDataUrl,
						"PNG",
						x,
						y + qrSizeMm,
						qrSizeMm,
						labelHeightMm,
						undefined,
						"FAST",
					);
				}
			}

			pdf.save(`store-${store.id}-qrcodes.pdf`);
		} finally {
			setIsExportingPdf(false);
		}
	};

	const QrCodeCard = ({
		title,
		url,
		description,
	}: {
		title: string;
		url: string;
		description?: string;
	}) => (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{title}</CardTitle>
				{description && (
					<p className="text-sm text-muted-foreground">{description}</p>
				)}
			</CardHeader>
			<CardContent className="flex flex-col items-center gap-4">
				<Link
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={`QR code for ${title} at ${store.name}`}
					className="transition-opacity hover:opacity-80"
				>
					{/* eslint-disable-next-line jsx-a11y/alt-text */}
					<Image
						text={url}
						options={{
							type: "image/jpeg",
							quality: 1,
							errorCorrectionLevel: "high",
							margin: 2,
							scale: 1,
							width: 200,
							color: {},
						}}
					/>
				</Link>
				<Link
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					className="text-xs text-muted-foreground break-all hover:underline"
				>
					{url}
				</Link>
			</CardContent>
		</Card>
	);

	return (
		<div className="space-y-6">
			<div className="flex justify-end">
				<Button onClick={handleExportPdf} disabled={isExportingPdf}>
					{isExportingPdf
						? t("qr_code_export_pdf_generating") || "Generating PDF..."
						: t("qr_code_export_pdf") || "Export QR PDF"}
				</Button>
			</div>

			{/* Store Ordering URL */}
			<QrCodeCard
				title={t("qr_code_ordering_URL") || "Ordering URL"}
				url={orderingUrl}
				description={
					t("qr_code_ordering_URL_descr") || "QR code for online ordering"
				}
			/>

			{/* Reservation URL */}
			<QrCodeCard
				title={t("qr_code_reservation_URL") || "Reservation URL"}
				url={reservationUrl}
				description={
					t("qr_code_reservation_URL_descr") ||
					"QR code for making reservations"
				}
			/>

			{/* Waiting List URL */}
			<QrCodeCard
				title={t("qr_code_waiting_list_URL") || "Waiting List URL"}
				url={waitingListUrl}
				description={
					t("qr_code_waiting_list_URL_descr") ||
					"QR code for making reservations"
				}
			/>

			{/* LIFF URL */}
			<QrCodeCard
				title={t("qr_code_liff_URL") || "LIFF URL"}
				url={liffUrl}
				description={t("qr_code_liff_URL_descr") || "QR code for LIFF entry"}
			/>

			{/* Facility Ordering URLs */}
			{facilities.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							{t("qr_code_facility_ordering_URL") || "Facility Ordering URLs"}
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							{t("qr_code_facility_ordering_URL_descr") ||
								"QR codes for facility-specific ordering"}
						</p>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{facilities.map((facility) => {
								const facilityUrl = `${baseUrl}/s/${store.id}/${facility.id}`;
								return (
									<Card key={facility.id}>
										<CardHeader>
											<CardTitle className="text-sm">
												{facility.facilityName}
											</CardTitle>
										</CardHeader>
										<CardContent className="flex flex-col items-center gap-3">
											<Link
												href={facilityUrl}
												target="_blank"
												rel="noopener noreferrer"
												aria-label={`QR code for facility ${facility.facilityName} ordering at ${store.name}`}
												className="transition-opacity hover:opacity-80"
											>
												{/* eslint-disable-next-line jsx-a11y/alt-text */}
												<Image
													text={facilityUrl}
													options={{
														type: "image/jpeg",
														quality: 1,
														errorCorrectionLevel: "high",
														margin: 2,
														scale: 1,
														width: 200,
														color: {},
													}}
												/>
											</Link>
											<Link
												href={facilityUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="text-xs text-muted-foreground break-all hover:underline text-center"
											>
												{facilityUrl}
											</Link>
										</CardContent>
									</Card>
								);
							})}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
};
