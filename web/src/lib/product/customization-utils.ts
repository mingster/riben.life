import type { TFunction } from "i18next";

import { parseBagCustomizationPayload } from "@/lib/product/bag-customization";
import { roundMoney } from "@/lib/shop/money";
import type { BagCustomization } from "@/types/customizer";
import { DEFAULT_CUSTOMIZATION } from "@/types/customizer";

export function serializeCustomization(
	customization: BagCustomization,
): string {
	return JSON.stringify(customization);
}

export function deserializeCustomization(json: string): BagCustomization {
	try {
		const parsed: unknown = JSON.parse(json);
		const r = parseBagCustomizationPayload(parsed);
		if (r.success) return r.data;
	} catch {
		// fall through
	}
	return DEFAULT_CUSTOMIZATION;
}

export function validateCustomization(data: unknown): data is BagCustomization {
	return parseBagCustomizationPayload(data).success;
}

/** Flat surcharge when any option differs from {@link DEFAULT_CUSTOMIZATION}. */
const CUSTOMIZATION_SURCHARGE_FLAT = 2000;

function isCustomizationAtDefault(customization: BagCustomization): boolean {
	const d = DEFAULT_CUSTOMIZATION;
	return (
		customization.schemaVersion === d.schemaVersion &&
		customization.color === d.color &&
		customization.material === d.material &&
		customization.initials === d.initials &&
		customization.initialsFontSize === d.initialsFontSize &&
		customization.initialsColor === d.initialsColor &&
		customization.patternScale === d.patternScale &&
		customization.patternRotation === d.patternRotation &&
		customization.patternOpacity === d.patternOpacity &&
		customization.width === d.width &&
		customization.height === d.height &&
		customization.depth === d.depth &&
		customization.frontImageDataUrl === d.frontImageDataUrl &&
		customization.frontPhotoPanU === d.frontPhotoPanU &&
		customization.frontPhotoPanV === d.frontPhotoPanV &&
		customization.frontPhotoScale === d.frontPhotoScale &&
		customization.frontPhotoCropZoom === d.frontPhotoCropZoom &&
		customization.frontPhotoCropPanU === d.frontPhotoCropPanU &&
		customization.frontPhotoCropPanV === d.frontPhotoCropPanV
	);
}

export function estimateCustomizationSurchargeBreakdown(
	_basePrice: number,
	customization: BagCustomization,
): {
	material: number;
	size: number;
	initials: number;
	frontImage: number;
	total: number;
} {
	const total = isCustomizationAtDefault(customization)
		? 0
		: roundMoney(CUSTOMIZATION_SURCHARGE_FLAT);
	return { material: 0, size: 0, initials: 0, frontImage: 0, total };
}

export function estimateCustomizationPrice(
	basePrice: number,
	customization: BagCustomization,
): number {
	const b = estimateCustomizationSurchargeBreakdown(basePrice, customization);
	return roundMoney(basePrice + b.total);
}

export function getCustomizationSummary(
	customization: BagCustomization,
	t: TFunction<"customized">,
): string {
	const parts: string[] = [];
	if (customization.initials.trim()) {
		parts.push(
			t("summary_line_initials", { initials: customization.initials }),
		);
	}
	if (customization.frontImageDataUrl?.trim()) {
		parts.push(t("summary_line_front_image"));
	}
	if (parts.length === 0) {
		return t("summary_standard_configuration");
	}
	return parts.join(" | ");
}
