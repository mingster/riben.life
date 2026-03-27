"use client";

import { useTranslation } from "@/app/i18n/client";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { ErrorCorrectionLevel } from "@/lib/qr/types";
import { ERROR_CORRECTION_LEVELS } from "@/lib/qr/types";
import { useI18n } from "@/providers/i18n-provider";

interface QRSettingsProps {
	size: number;
	onSizeChange: (value: number) => void;
	foregroundColor: string;
	onForegroundColorChange: (value: string) => void;
	backgroundColor: string;
	onBackgroundColorChange: (value: string) => void;
	transparentBackground: boolean;
	onTransparentBackgroundChange: (value: boolean) => void;
	errorCorrectionLevel: ErrorCorrectionLevel;
	onErrorCorrectionLevelChange: (value: ErrorCorrectionLevel) => void;
	margin: number;
	onMarginChange: (value: number) => void;
}

export function QRSettings({
	size,
	onSizeChange,
	foregroundColor,
	onForegroundColorChange,
	backgroundColor,
	onBackgroundColorChange,
	transparentBackground,
	onTransparentBackgroundChange,
	errorCorrectionLevel,
	onErrorCorrectionLevelChange,
	margin,
	onMarginChange,
}: QRSettingsProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "qr-generator");

	return (
		<Accordion
			type="multiple"
			defaultValue={["size", "colors", "advanced"]}
			className="w-full"
		>
			{/* Size & Dimensions */}
			<AccordionItem value="size">
				<AccordionTrigger>{t("settings_size_dimensions")}</AccordionTrigger>
				<AccordionContent className="space-y-4 pb-4">
					{/* Size */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="size-slider">{t("settings_size_label")}</Label>
							<span className="text-sm text-muted-foreground">{size}px</span>
						</div>
						<Slider
							id="size-slider"
							min={100}
							max={800}
							step={50}
							value={[size]}
							onValueChange={(value) => onSizeChange(value[0])}
						/>
					</div>

					{/* Margin */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="margin-slider">
								{t("settings_border_label")}
							</Label>
							<span className="text-sm text-muted-foreground">
								{margin}{" "}
								{margin === 1
									? t("settings_border_module")
									: t("settings_border_modules")}
							</span>
						</div>
						<Slider
							id="margin-slider"
							min={0}
							max={10}
							step={1}
							value={[margin]}
							onValueChange={(value) => onMarginChange(value[0])}
						/>
					</div>
				</AccordionContent>
			</AccordionItem>

			{/* Colors */}
			<AccordionItem value="colors">
				<AccordionTrigger>{t("settings_colors")}</AccordionTrigger>
				<AccordionContent className="space-y-4 pb-4">
					{/* Foreground Color */}
					<div className="space-y-2">
						<Label htmlFor="fg-color">{t("settings_color_label")}</Label>
						<div className="flex gap-2">
							<input
								id="fg-color"
								type="color"
								value={foregroundColor}
								onChange={(e) => onForegroundColorChange(e.target.value)}
								className="size-10 cursor-pointer rounded border"
							/>
							<input
								type="text"
								value={foregroundColor}
								onChange={(e) => onForegroundColorChange(e.target.value)}
								className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
								placeholder="#000000"
							/>
						</div>
					</div>

					{/* Transparent Background */}
					<div className="flex items-center justify-between rounded-lg border p-3">
						<Label htmlFor="transparent-bg" className="cursor-pointer">
							{t("settings_bg_transparent")}
						</Label>
						<Switch
							id="transparent-bg"
							checked={transparentBackground}
							onCheckedChange={onTransparentBackgroundChange}
						/>
					</div>

					{/* Background Color */}
					{!transparentBackground && (
						<div className="space-y-2">
							<Label htmlFor="bg-color">{t("settings_bg_color_label")}</Label>
							<div className="flex gap-2">
								<input
									id="bg-color"
									type="color"
									value={backgroundColor}
									onChange={(e) => onBackgroundColorChange(e.target.value)}
									className="size-10 cursor-pointer rounded border"
								/>
								<input
									type="text"
									value={backgroundColor}
									onChange={(e) => onBackgroundColorChange(e.target.value)}
									className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
									placeholder="#ffffff"
								/>
							</div>
						</div>
					)}
				</AccordionContent>
			</AccordionItem>

			{/* Advanced Options */}
			<AccordionItem value="advanced">
				<AccordionTrigger>{t("settings_advanced")}</AccordionTrigger>
				<AccordionContent className="space-y-4 pb-4">
					{/* Error Correction Level */}
					<div className="space-y-2">
						<Label htmlFor="error-correction">
							{t("settings_error_correction")}
						</Label>
						<Select
							value={errorCorrectionLevel}
							onValueChange={(value) =>
								onErrorCorrectionLevelChange(value as ErrorCorrectionLevel)
							}
						>
							<SelectTrigger id="error-correction">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{ERROR_CORRECTION_LEVELS.map((level) => (
									<SelectItem key={level.value} value={level.value}>
										<div className="flex flex-col">
											<span className="font-medium">
												{t(`error_correction_${level.value}`)}
											</span>
											<span className="text-xs text-muted-foreground">
												{t(`error_correction_${level.value}_desc`)}
											</span>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
