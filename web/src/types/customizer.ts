import type { BagCustomization } from "@/actions/product/customize-product.validation";

export type { BagCustomization };

/**
 * Vertical pan applied when the user uploads a new front photo. Negative values move the decal
 * toward the bottom of the front panel (`computePhotoDecalPlacementWithPan` in `bag-textured-gltf-model.tsx`).
 */
export const DEFAULT_FRONT_PHOTO_PAN_V_ON_UPLOAD = -0.45;

export const DEFAULT_CUSTOMIZATION: BagCustomization = {
	schemaVersion: 1,
	color: "#000000",
	material: "canvas",
	initials: "",
	initialsFontSize: 24,
	initialsColor: "#ffffff",
	patternScale: 1,
	patternRotation: 0,
	patternOpacity: 0.8,
	width: 35,
	height: 28,
	depth: 15,
	frontImageDataUrl: null,
	frontPhotoPanU: 0,
	frontPhotoPanV: 0,
	frontPhotoScale: 1,
	frontPhotoCropZoom: 1,
	frontPhotoCropPanU: 0,
	frontPhotoCropPanV: 0,
};

/** i18n keys in `customized` namespace (e.g. `color_preset_black`). */
export const COLOR_PRESETS = [
	{ nameKey: "color_preset_black", value: "#000000" },
	{ nameKey: "color_preset_navy", value: "#001f3f" },
	{ nameKey: "color_preset_burgundy", value: "#800020" },
	{ nameKey: "color_preset_forest_green", value: "#228B22" },
	{ nameKey: "color_preset_camel", value: "#C19A6B" },
	{ nameKey: "color_preset_cream", value: "#FFFDD0" },
	{ nameKey: "color_preset_gray", value: "#808080" },
	{ nameKey: "color_preset_blush", value: "#FFC0CB" },
] as const;

export const SIZE_PRESETS = [
	{ nameKey: "size_preset_small", width: 30, height: 24, depth: 12 },
	{ nameKey: "size_preset_medium", width: 35, height: 28, depth: 15 },
	{ nameKey: "size_preset_large", width: 40, height: 32, depth: 18 },
] as const;

export const MATERIAL_PRESETS = [
	{ value: "canvas" },
	{ value: "leather" },
	{ value: "nylon" },
] as const;
