"use client";

import { useTranslation } from "@/app/i18n/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type {
	CornerDotStyle,
	CornerSquareStyle,
	ErrorCorrectionLevel,
	QRCodeOptions,
} from "@/lib/qr/types";
import { useI18n } from "@/providers/i18n-provider";
import { useCallback, useState } from "react";
import { DownloadButton } from "./download-button";
import { QRCornerSquareSettings } from "./qr-corner-square-settings";
import { QRPreview } from "./qr-preview";
import { QRSettings } from "./qr-settings";
import { URLInput } from "./url-input";

export function QRGeneratorClient() {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "qr-generator");

	// Content state
	const [url, setUrl] = useState("https://");

	// QR settings state
	const [size, setSize] = useState(300);
	const [foregroundColor, setForegroundColor] = useState("#1a4d05");
	const [backgroundColor, setBackgroundColor] = useState("#ffffff");
	const [transparentBackground, setTransparentBackground] = useState(true);
	const [errorCorrectionLevel, setErrorCorrectionLevel] =
		useState<ErrorCorrectionLevel>("H");
	const [margin, setMargin] = useState(4);

	// Corner square settings
	const [cornerSquareEnabled, setCornerSquareEnabled] = useState(false);
	const [outerStyle, setOuterStyle] = useState<CornerSquareStyle>("default");
	const [outerColor, setOuterColor] = useState("#1a4d05");
	const [useCustomOuterColor, setUseCustomOuterColor] = useState(false);
	const [innerStyle, setInnerStyle] = useState<CornerDotStyle>("default");
	const [innerColor, setInnerColor] = useState("#1a4d05");
	const [useCustomInnerColor, setUseCustomInnerColor] = useState(false);

	// Generated QR code
	const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);

	// Build options object
	const qrOptions: QRCodeOptions = {
		content: url,
		size,
		foregroundColor,
		backgroundColor,
		transparentBackground,
		errorCorrectionLevel,
		margin,
		cornerSquare: cornerSquareEnabled
			? {
					outerStyle,
					outerColor: useCustomOuterColor ? outerColor : undefined,
					innerStyle,
					innerColor: useCustomInnerColor ? innerColor : undefined,
				}
			: undefined,
	};

	// Handle QR code generation
	const handleGenerated = useCallback((_dataURL: string, blob: Blob) => {
		setGeneratedBlob(blob);
	}, []);

	return (
		<div className="space-y-1">
			{/* Header */}
			<div className="space-y-2">
				<p className="text-muted-foreground">{t("page_description")}</p>
			</div>

			<Separator />

			{/* Main Grid Layout */}
			<div className="grid gap-2 lg:grid-cols-2">
				{/* Left Column - Input & Settings */}
				<div className="space-y-1">
					{/* URL Input */}
					<Card>
						<CardHeader>
							<CardTitle>{t("content_type_title")}</CardTitle>
						</CardHeader>
						<CardContent>
							<URLInput value={url} onChange={setUrl} />
						</CardContent>
					</Card>

					{/* Settings */}
					<QRSettings
						size={size}
						onSizeChange={setSize}
						foregroundColor={foregroundColor}
						onForegroundColorChange={setForegroundColor}
						backgroundColor={backgroundColor}
						onBackgroundColorChange={setBackgroundColor}
						transparentBackground={transparentBackground}
						onTransparentBackgroundChange={setTransparentBackground}
						errorCorrectionLevel={errorCorrectionLevel}
						onErrorCorrectionLevelChange={setErrorCorrectionLevel}
						margin={margin}
						onMarginChange={setMargin}
					/>

					{/* Corner Square Settings */}
					<QRCornerSquareSettings
						enabled={cornerSquareEnabled}
						onEnabledChange={setCornerSquareEnabled}
						outerStyle={outerStyle}
						onOuterStyleChange={setOuterStyle}
						outerColor={outerColor}
						onOuterColorChange={setOuterColor}
						useCustomOuterColor={useCustomOuterColor}
						onUseCustomOuterColorChange={setUseCustomOuterColor}
						innerStyle={innerStyle}
						onInnerStyleChange={setInnerStyle}
						innerColor={innerColor}
						onInnerColorChange={setInnerColor}
						useCustomInnerColor={useCustomInnerColor}
						onUseCustomInnerColorChange={setUseCustomInnerColor}
					/>
				</div>

				{/* Right Column - Preview & Download */}
				<div className="space-y-1">
					{/* Preview */}
					<QRPreview options={qrOptions} onGenerated={handleGenerated} />

					{/* Download Button */}
					<DownloadButton
						blob={generatedBlob}
						disabled={!url || url === "https://"}
					/>
				</div>
			</div>

			{/* Info Section */}
			<Card className="border-muted bg-muted/50">
				<CardContent className="pt-1">
					<div className="space-y-1 font-mono text-xs text-muted-foreground">
						<p className="text-foreground">{t("info_about_title")}</p>
						<p>{t("info_about_description")}</p>
						<p>{t("info_error_correction")}</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
