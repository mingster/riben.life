"use client";

import { useId, useRef, useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { FrontPhotoCropDialog } from "@/components/customizer/front-photo-crop-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/providers/i18n-provider";
import {
	type BagCustomization,
	DEFAULT_FRONT_PHOTO_PAN_V_ON_UPLOAD,
} from "@/types/customizer";

interface CustomizerControlsProps {
	customization: BagCustomization;
	onChange: (customization: BagCustomization) => void;
	/** When provided, copy references the 3D toolbar (move photo). */
	onPhotoRepositionModeChange?: (active: boolean) => void;
	/** True while “move photo” mode is on — copy references sliders below the preview button. */
	photoRepositionMode?: boolean;
}

export function CustomizerControls({
	customization,
	onChange,
	onPhotoRepositionModeChange,
	photoRepositionMode = false,
}: CustomizerControlsProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "customized");
	const fileInputId = useId();
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [photoScaleEditorOpen, setPhotoScaleEditorOpen] = useState(false);
	const [frontPhotoCropDialogOpen, setFrontPhotoCropDialogOpen] =
		useState(false);
	const customizationRef = useRef(customization);
	customizationRef.current = customization;

	const updateCustomization = (updates: Partial<BagCustomization>) => {
		onChange({ ...customization, ...updates });
	};

	const handleFrontImageFile = (file: File | undefined) => {
		setUploadError(null);
		if (!file) {
			return;
		}
		if (!file.type.startsWith("image/")) {
			setUploadError(t("front_photo_error_type"));
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result;
			if (typeof result === "string") {
				onPhotoRepositionModeChange?.(false);
				setPhotoScaleEditorOpen(false);
				setFrontPhotoCropDialogOpen(false);
				onChange({
					...customizationRef.current,
					frontImageDataUrl: result,
					frontPhotoPanU: 0,
					frontPhotoPanV: DEFAULT_FRONT_PHOTO_PAN_V_ON_UPLOAD,
					frontPhotoScale: 1,
					frontPhotoCropZoom: 1,
					frontPhotoCropPanU: 0,
					frontPhotoCropPanV: 0,
				});
			}
		};
		reader.onerror = () => {
			setUploadError(t("toast_error_generic"));
		};
		reader.readAsDataURL(file);
	};

	return (
		<div className="w-full space-y-8 overflow-y-auto max-h-[min(85vh,920px)] pr-0.5">
			<div className="space-y-2">
				<p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
					{t("panel_eyebrow")}
				</p>
				<h2 className="font-serif text-2xl font-light tracking-tight text-foreground sm:text-[1.65rem]">
					{t("panel_title")}
				</h2>
				<p className="text-sm leading-relaxed text-muted-foreground">
					{t("panel_subtitle")}
				</p>
			</div>

			<Tabs defaultValue="photo" className="w-full">
				<TabsList className="mb-4 grid h-auto w-full grid-cols-2">
					<TabsTrigger value="photo" className="touch-manipulation text-xs">
						{t("tab_front_photo")}
					</TabsTrigger>
					<TabsTrigger value="initials" className="touch-manipulation text-xs">
						{t("tab_monogram")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="photo" className="space-y-4 pt-2">
					<div>
						<Label htmlFor={fileInputId} className="text-sm font-medium">
							{t("front_photo_label")}
						</Label>
						<p className="mb-2 mt-1 text-xs font-mono text-muted-foreground">
							{t("front_photo_hint")}
						</p>
						<Input
							id={fileInputId}
							type="file"
							accept="image/jpeg,image/png,image/webp,image/gif"
							className="cursor-pointer"
							onChange={(e) => {
								const f = e.target.files?.[0];
								handleFrontImageFile(f);
								e.target.value = "";
							}}
						/>
						{uploadError ? (
							<p className="text-sm text-destructive mt-2">{uploadError}</p>
						) : null}
					</div>

					{customization.frontImageDataUrl ? (
						<div className="space-y-2">
							<p className="text-xs text-muted-foreground">
								{photoRepositionMode
									? t("front_photo_reposition_intro")
									: onPhotoRepositionModeChange
										? t("front_photo_reposition_hint_before_move")
										: t("front_photo_pan_hint")}
							</p>
							<div className="relative aspect-4/3 max-h-48 overflow-hidden rounded-md border border-border">
								<img
									key={customization.frontImageDataUrl}
									src={customization.frontImageDataUrl}
									alt=""
									className="h-full w-full object-cover"
									style={{
										transform: `scale(${customization.frontPhotoCropZoom ?? 1}) translate(${-(customization.frontPhotoCropPanU ?? 0) * ((customization.frontPhotoCropZoom ?? 1) - 1) * 42}%, ${-(customization.frontPhotoCropPanV ?? 0) * ((customization.frontPhotoCropZoom ?? 1) - 1) * 42}%)`,
										transformOrigin: "center center",
									}}
								/>
							</div>
							<div className="flex flex-wrap gap-x-4 gap-y-1">
								<Button
									type="button"
									variant="link"
									className="h-auto min-h-10 justify-start p-0 text-sm touch-manipulation sm:min-h-0"
									onClick={() => setPhotoScaleEditorOpen((o) => !o)}
								>
									{t("front_photo_scale_link")}
								</Button>
								<Button
									type="button"
									variant="link"
									className="h-auto min-h-10 justify-start p-0 text-sm touch-manipulation sm:min-h-0"
									onClick={() => setFrontPhotoCropDialogOpen(true)}
								>
									{t("front_photo_crop_link")}
								</Button>
							</div>
							{photoScaleEditorOpen ? (
								<div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
									<Label className="text-sm font-medium">
										{t("front_photo_scale_slider_label", {
											pct: Math.round(
												(customization.frontPhotoScale ?? 1) * 100,
											),
										})}
									</Label>
									<Slider
										min={35}
										max={200}
										step={5}
										value={[
											Math.round((customization.frontPhotoScale ?? 1) * 100),
										]}
										onValueChange={(value) =>
											updateCustomization({
												frontPhotoScale: value[0] / 100,
											})
										}
										className="pt-1 touch-manipulation"
									/>
									<p className="text-xs font-mono text-gray-500">
										{t("front_photo_scale_descr")}
									</p>
									<Button
										type="button"
										size="sm"
										className="w-full touch-manipulation"
										onClick={() => setPhotoScaleEditorOpen(false)}
									>
										{t("front_photo_scale_done")}
									</Button>
								</div>
							) : null}
							<FrontPhotoCropDialog
								open={frontPhotoCropDialogOpen}
								onOpenChange={setFrontPhotoCropDialogOpen}
								imageSrc={customization.frontImageDataUrl ?? ""}
								title={t("front_photo_crop_dialog_title")}
								description={t("front_photo_crop_dialog_descr")}
								confirmLabel={t("front_photo_crop_dialog_confirm")}
								cancelLabel={t("front_photo_crop_dialog_cancel")}
								onConfirm={(croppedDataUrl) => {
									updateCustomization({
										frontImageDataUrl: croppedDataUrl,
										frontPhotoCropZoom: 1,
										frontPhotoCropPanU: 0,
										frontPhotoCropPanV: 0,
									});
								}}
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="w-full"
								onClick={() => {
									onPhotoRepositionModeChange?.(false);
									setPhotoScaleEditorOpen(false);
									setFrontPhotoCropDialogOpen(false);
									updateCustomization({
										frontImageDataUrl: null,
										frontPhotoPanU: 0,
										frontPhotoPanV: 0,
										frontPhotoScale: 1,
										frontPhotoCropZoom: 1,
										frontPhotoCropPanU: 0,
										frontPhotoCropPanV: 0,
									});
								}}
							>
								{t("front_photo_remove")}
							</Button>
						</div>
					) : null}
				</TabsContent>
				<TabsContent value="initials" className="space-y-4 pt-2">
					<div>
						<Label htmlFor="initials" className="text-sm font-medium">
							{t("initials_label")}
						</Label>
						<Input
							id="initials"
							type="text"
							value={customization.initials}
							onChange={(e) =>
								updateCustomization({
									initials: e.target.value.slice(0, 4).toUpperCase(),
								})
							}
							placeholder={t("initials_placeholder")}
							maxLength={4}
							className="mt-2 h-10 w-full max-w-md text-base sm:text-sm touch-manipulation"
						/>
						<p className="mt-1 text-xs text-muted-foreground">
							{t("initials_max_chars_note")}
						</p>
					</div>

					<div>
						<Label htmlFor="text-font-size" className="text-sm font-medium">
							{t("text_size_label", { px: customization.initialsFontSize })}
						</Label>
						<Slider
							id="text-font-size"
							min={12}
							max={72}
							step={2}
							value={[customization.initialsFontSize]}
							onValueChange={(value) =>
								updateCustomization({ initialsFontSize: value[0] })
							}
							className="mt-2"
						/>
					</div>

					<div>
						<Label className="mb-3 block text-sm font-medium">
							{t("text_color_label")}
						</Label>
						<div className="flex gap-2">
							<input
								type="color"
								value={customization.initialsColor}
								onChange={(e) =>
									updateCustomization({ initialsColor: e.target.value })
								}
								className="h-10 w-16 cursor-pointer rounded-md border border-border"
							/>
							<Input
								type="text"
								value={customization.initialsColor}
								onChange={(e) =>
									updateCustomization({ initialsColor: e.target.value })
								}
								placeholder="#ffffff"
								className="flex-1"
							/>
						</div>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
