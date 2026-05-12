import { z } from "zod";

const customizationCoreFields = {
	color: z.string().regex(/^#[0-9A-F]{6}$/i),
	material: z.enum(["canvas", "leather", "nylon"]),
	initials: z.string().max(4),
	initialsFontSize: z.number().min(12).max(72),
	initialsColor: z.string().regex(/^#[0-9A-F]{6}$/i),
	patternScale: z.number().min(0.5).max(2),
	patternRotation: z.number().min(0).max(360),
	patternOpacity: z.number().min(0).max(1),
	width: z.number().min(25).max(50),
	height: z.number().min(20).max(40),
	depth: z.number().min(10).max(25),
	/** Data URL of user image for front panel; null when cleared or absent in legacy JSON. */
	frontImageDataUrl: z
		.union([z.string(), z.literal(""), z.null()])
		.optional()
		.transform((v) => {
			if (v === undefined || v === null || v === "") {
				return null;
			}
			return v;
		}),
	/** Normalized in-plane offset for front photo decal (-1…1); 0 = auto center. */
	frontPhotoPanU: z.number().min(-1.2).max(1.2).default(0),
	frontPhotoPanV: z.number().min(-1.2).max(1.2).default(0),
	/** Multiplier for front photo decal size on the bag (1 = default auto fit). */
	frontPhotoScale: z.number().min(0.35).max(2).default(1),
	/** Zoom into source image before mapping to square decal (1 = full cover, higher = tighter crop). */
	frontPhotoCropZoom: z.number().min(1).max(3).default(1),
	/** Framing pan in image space when zoomed; -1…1 shifts visible region horizontally. */
	frontPhotoCropPanU: z.number().min(-1).max(1).default(0),
	/** Framing pan in image space when zoomed; -1…1 shifts visible region vertically. */
	frontPhotoCropPanV: z.number().min(-1).max(1).default(0),
} as const;

export const bagCustomizationCoreSchema = z.object(customizationCoreFields);

/** Canonical stored shape (v1). */
export const bagCustomizationSchemaV1 = z.object({
	schemaVersion: z.literal(1),
	...customizationCoreFields,
});

/** Legacy payloads without `schemaVersion` (normalized to v1). */
export const bagCustomizationLegacySchema = z.object(customizationCoreFields);

export const bagCustomizationNormalizedSchema = z.union([
	bagCustomizationSchemaV1,
	bagCustomizationLegacySchema.transform((data) => ({
		schemaVersion: 1 as const,
		...data,
	})),
]);

/** Client → server: must send explicit v1 marker. */
export const bagCustomizationClientInputSchema = bagCustomizationSchemaV1;

export type BagCustomization = z.infer<typeof bagCustomizationSchemaV1>;
export type BagCustomizationValidated = BagCustomization;

export function parseBagCustomizationPayload(data: unknown) {
	return bagCustomizationNormalizedSchema.safeParse(data);
}
