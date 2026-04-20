import type { ProductAttribute } from "@prisma/client";
import type { BagCustomization } from "@/types/customizer";
import { DEFAULT_CUSTOMIZATION } from "@/types/customizer";

function decimalToPositiveCm(
	value: ProductAttribute["width"] | null | undefined,
): number | null {
	if (value == null) {
		return null;
	}
	const n = Number(value);
	if (!Number.isFinite(n) || n <= 0) {
		return null;
	}
	return n;
}

/**
 * Maps `ProductAttribute` dimensions (L×H×W in schema) to `BagCustomization` width/height/depth (cm).
 * Returns a partial to merge into defaults; skips axes with missing or non-positive DB values.
 */
export function referenceCustomizationFromProductAttribute(
	attr: Pick<ProductAttribute, "width" | "height" | "length"> | null,
): Partial<BagCustomization> {
	if (!attr) {
		return {};
	}
	const widthCm = decimalToPositiveCm(attr.width);
	const heightCm = decimalToPositiveCm(attr.height);
	/** Schema `length` is depth (L×H×W first dimension). */
	const depthCm = decimalToPositiveCm(attr.length);

	const patch: Partial<BagCustomization> = {};
	if (widthCm != null) {
		patch.width = widthCm;
	}
	if (heightCm != null) {
		patch.height = heightCm;
	}
	if (depthCm != null) {
		patch.depth = depthCm;
	}
	return patch;
}

/** Merge product reference dimensions with {@link DEFAULT_CUSTOMIZATION} for customizer initial state. */
export function buildInitialCustomizationFromProduct(
	attr: Pick<ProductAttribute, "width" | "height" | "length"> | null,
): BagCustomization {
	return {
		...DEFAULT_CUSTOMIZATION,
		...referenceCustomizationFromProductAttribute(attr),
	};
}
