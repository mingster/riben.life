"use client";

import type { Store } from "@/types";
import { getAbsoluteUrl } from "@/utils/utils";
import type { StoreFacility } from "@prisma/client";
import { useQRCode } from "next-qrcode";
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
	const orderingUrl = `${baseUrl}/${store.id}`;
	const reservationUrl = `${baseUrl}/${store.id}/reservation`;
	const waitingListUrl = `${baseUrl}/${store.id}/waiting-list`;

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
								const facilityUrl = `${baseUrl}/${store.id}/${facility.id}`;
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
