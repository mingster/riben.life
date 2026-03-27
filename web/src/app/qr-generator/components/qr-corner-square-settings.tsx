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
import { Switch } from "@/components/ui/switch";
import type { CornerDotStyle, CornerSquareStyle } from "@/lib/qr/types";
import { useI18n } from "@/providers/i18n-provider";

interface QRCornerSquareSettingsProps {
	enabled: boolean;
	onEnabledChange: (value: boolean) => void;
	outerStyle: CornerSquareStyle;
	onOuterStyleChange: (value: CornerSquareStyle) => void;
	outerColor: string;
	onOuterColorChange: (value: string) => void;
	useCustomOuterColor: boolean;
	onUseCustomOuterColorChange: (value: boolean) => void;
	innerStyle: CornerDotStyle;
	onInnerStyleChange: (value: CornerDotStyle) => void;
	innerColor: string;
	onInnerColorChange: (value: string) => void;
	useCustomInnerColor: boolean;
	onUseCustomInnerColorChange: (value: boolean) => void;
}

export function QRCornerSquareSettings({
	enabled,
	onEnabledChange,
	outerStyle,
	onOuterStyleChange,
	outerColor,
	onOuterColorChange,
	useCustomOuterColor,
	onUseCustomOuterColorChange,
	innerStyle,
	onInnerStyleChange,
	innerColor,
	onInnerColorChange,
	useCustomInnerColor,
	onUseCustomInnerColorChange,
}: QRCornerSquareSettingsProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "qr-generator");

	return (
		<div className="space-y-4">
			{/* Enable/Disable Toggle */}
			<div className="flex items-center justify-between rounded-lg border p-4">
				<div>
					<Label className="text-base font-semibold">
						{t("corner_square_title")}
					</Label>
					<p className="text-sm text-muted-foreground">
						{t("corner_square_description")}
					</p>
				</div>
				<Switch
					checked={enabled}
					onCheckedChange={onEnabledChange}
					aria-label="Enable corner square customization"
				/>
			</div>

			{/* Settings Accordion */}
			{enabled && (
				<Accordion
					type="multiple"
					defaultValue={["outer", "inner"]}
					className="w-full"
				>
					{/* Outer Frame */}
					<AccordionItem value="outer">
						<AccordionTrigger>{t("corner_outer_frame")}</AccordionTrigger>
						<AccordionContent className="space-y-4 pb-4">
							<div className="space-y-2">
								<Label htmlFor="outer-style" className="text-sm">
									{t("corner_style_label")}
								</Label>
								<Select
									value={outerStyle}
									onValueChange={(value) =>
										onOuterStyleChange(value as CornerSquareStyle)
									}
								>
									<SelectTrigger id="outer-style">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="default">
											{t("corner_style_default")}
										</SelectItem>
										<SelectItem value="square">
											{t("corner_style_square")}
										</SelectItem>
										<SelectItem value="rounded">
											{t("corner_style_rounded")}
										</SelectItem>
										<SelectItem value="dot">{t("corner_style_dot")}</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label htmlFor="custom-outer-color" className="text-sm">
										{t("corner_custom_color")}
									</Label>
									<Switch
										id="custom-outer-color"
										checked={useCustomOuterColor}
										onCheckedChange={onUseCustomOuterColorChange}
									/>
								</div>
								{useCustomOuterColor && (
									<div className="flex gap-2">
										<input
											type="color"
											value={outerColor}
											onChange={(e) => onOuterColorChange(e.target.value)}
											className="size-10 cursor-pointer rounded border"
										/>
										<input
											type="text"
											value={outerColor}
											onChange={(e) => onOuterColorChange(e.target.value)}
											className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
											placeholder="#000000"
										/>
									</div>
								)}
							</div>
						</AccordionContent>
					</AccordionItem>

					{/* Inner Frame */}
					<AccordionItem value="inner">
						<AccordionTrigger>{t("corner_inner_frame")}</AccordionTrigger>
						<AccordionContent className="space-y-4 pb-4">
							<div className="space-y-2">
								<Label htmlFor="inner-style" className="text-sm">
									{t("corner_style_label")}
								</Label>
								<Select
									value={innerStyle}
									onValueChange={(value) =>
										onInnerStyleChange(value as CornerDotStyle)
									}
								>
									<SelectTrigger id="inner-style">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="default">
											{t("corner_style_default")}
										</SelectItem>
										<SelectItem value="square">
											{t("corner_style_square")}
										</SelectItem>
										<SelectItem value="rounded">
											{t("corner_style_rounded")}
										</SelectItem>
										<SelectItem value="dot">{t("corner_style_dot")}</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label htmlFor="custom-inner-color" className="text-sm">
										{t("corner_custom_color")}
									</Label>
									<Switch
										id="custom-inner-color"
										checked={useCustomInnerColor}
										onCheckedChange={onUseCustomInnerColorChange}
									/>
								</div>
								{useCustomInnerColor && (
									<div className="flex gap-2">
										<input
											type="color"
											value={innerColor}
											onChange={(e) => onInnerColorChange(e.target.value)}
											className="size-10 cursor-pointer rounded border"
										/>
										<input
											type="text"
											value={innerColor}
											onChange={(e) => onInnerColorChange(e.target.value)}
											className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
											placeholder="#000000"
										/>
									</div>
								)}
							</div>
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			)}
		</div>
	);
}
