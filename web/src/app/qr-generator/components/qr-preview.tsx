"use client";

import { useTranslation } from "@/app/i18n/client";
import { Loader } from "@/components/loader";
import { Card, CardContent } from "@/components/ui/card";
import { generateQRCode } from "@/lib/qr/generator";
import type { QRCodeOptions } from "@/lib/qr/types";
import { useI18n } from "@/providers/i18n-provider";
import Image from "next/image";
import { useEffect, useState } from "react";

interface QRPreviewProps {
	options: QRCodeOptions;
	onGenerated?: (dataURL: string, blob: Blob) => void;
}

export function QRPreview({ options, onGenerated }: QRPreviewProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "qr-generator");

	const [dataURL, setDataURL] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string>("");

	useEffect(() => {
		const generate = async () => {
			// Don't generate if no content or just protocol
			if (
				!options.content ||
				options.content.trim() === "" ||
				options.content === "https://"
			) {
				setDataURL("");
				setLoading(false);
				return;
			}

			setLoading(true);
			setError("");

			try {
				const result = await generateQRCode(options);
				setDataURL(result.dataURL);
				onGenerated?.(result.dataURL, result.blob);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to generate QR code",
				);
				setDataURL("");
			} finally {
				setLoading(false);
			}
		};

		generate();
	}, [
		options.content,
		options.size,
		options.foregroundColor,
		options.backgroundColor,
		options.transparentBackground,
		options.errorCorrectionLevel,
		options.margin,
		options.cornerSquare?.outerStyle,
		options.cornerSquare?.outerColor,
		options.cornerSquare?.innerStyle,
		options.cornerSquare?.innerColor,
	]);

	return (
		<Card>
			<CardContent className="flex min-h-[400px] items-center justify-center p-6">
				{loading && <Loader />}

				{!loading && error && (
					<div className="text-center text-destructive">
						<p className="text-sm">{t("preview_error")}</p>
					</div>
				)}

				{!loading && !error && !dataURL && (
					<div className="text-center text-muted-foreground">
						<p className="text-sm">{t("preview_no_content")}</p>
					</div>
				)}

				{!loading && !error && dataURL && (
					<div className="flex flex-col items-center gap-4">
						<Image
							src={dataURL}
							alt="Generated QR Code"
							width={options.size}
							height={options.size}
							className="max-w-full rounded-lg shadow-md"
							unoptimized
						/>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
