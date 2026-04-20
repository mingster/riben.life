"use client";

import { useTranslation } from "@/app/i18n/client";
import { Suspense } from "react";
import { Bag3DCanvas } from "./bag-3d-canvas";
import type { BagCustomization } from "@/types/customizer";
import { getCustomizationSummary } from "@/lib/customization-utils";
import { Loader } from "@/components/loader";
import { useI18n } from "@/providers/i18n-provider";

interface CustomizationPreviewProps {
	customization: BagCustomization;
	compact?: boolean;
	className?: string;
}

export function CustomizationPreview({
	customization,
	compact = false,
	className = "",
}: CustomizationPreviewProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "customized");

	if (compact) {
		return (
			<div className={`bg-white rounded-lg p-4 ${className}`}>
				<div className="h-32 w-full bg-gradient-to-b from-slate-100 to-slate-200 rounded mb-3">
					<Suspense fallback={<Loader />}>
						<Bag3DCanvas customization={customization} />
					</Suspense>
				</div>
				<div className="space-y-1">
					<div
						className="w-full h-8 rounded border"
						style={{ backgroundColor: customization.color }}
					/>
					<p className="text-sm font-semibold text-gray-900">
						{customization.initials || t("preview_no_initials")}
					</p>
					<p className="text-xs text-gray-600">
						{getCustomizationSummary(customization, t)}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}
		>
			<div className="h-96 w-full">
				<Suspense fallback={<Loader />}>
					<Bag3DCanvas customization={customization} />
				</Suspense>
			</div>
			<div className="p-6 space-y-4">
				<div>
					<h3 className="font-semibold text-lg mb-2">
						{t("preview_design_details")}
					</h3>
					<div className="space-y-2 text-sm">
						<div className="flex items-center justify-between">
							<span className="text-gray-600">
								{t("preview_label_material")}
							</span>
							<span className="font-medium">
								{t(`material_${customization.material}`)}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-gray-600">{t("preview_label_size")}</span>
							<span className="font-medium">
								{t("size_preset_dims", {
									w: customization.width,
									h: customization.height,
									d: customization.depth,
								})}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-gray-600">{t("preview_label_color")}</span>
							<div className="flex items-center gap-2">
								<div
									className="w-6 h-6 rounded border"
									style={{ backgroundColor: customization.color }}
								/>
								<span className="font-medium">{customization.color}</span>
							</div>
						</div>
						{customization.initials ? (
							<div className="flex items-center justify-between">
								<span className="text-gray-600">
									{t("preview_label_initials")}
								</span>
								<span className="font-medium">{customization.initials}</span>
							</div>
						) : null}
						<div className="flex items-center justify-between">
							<span className="text-gray-600">
								{t("preview_label_pattern_scale")}
							</span>
							<span className="font-medium">
								{customization.patternScale.toFixed(1)}x
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
