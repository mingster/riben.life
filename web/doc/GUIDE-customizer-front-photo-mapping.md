# Customizer: front photo mapping and physical units

**Date:** 2026-04-03
**Status:** Active
**Related:** [GUIDE-meshy-bag-glb-naming.md](./GUIDE-meshy-bag-glb-naming.md), `web/src/components/customizer/bag-textured-gltf-model.tsx`, `web/src/components/customizer/bag-3d-canvas.tsx`, `web/src/components/customizer/customizer-controls.tsx`

## Overview

The 3D bag customizer projects an uploaded image onto the bag as a decal (or fallback plane). **There is no pixel-to-centimeter conversion** and no calibration to real print size. Sizes are derived from mesh geometry heuristics and scene scale. This document records current behavior so future work (true print area in cm, aspect-preserving textures, manufacturing export) can align with it.

## What happens today

### 1. Rasterization: image → texture

- The browser loads the file as a data URL; an `HTMLImageElement` is used client-side.
- `buildPhotoDecalTexture` in `bag-textured-gltf-model.tsx` draws the image into a **fixed 512×512** canvas.
- Drawing uses **`drawImageCover`** (same idea as CSS `object-fit: cover`): the image is scaled to **fill** the square; excess is **cropped**.
- **Pixel dimensions** of the file therefore only affect **how much of the image remains visible** after the square crop—not “centimeters on the bag.”

### 2. Decal size on the bag: scene units, not explicit cm

**Path A — GLB with front fabric mesh (`computeFabricDecalPlacement` / `computeFabricDecalPlacementInternal`):**

- Placement uses the fabric mesh **axis-aligned bounding box** in local space.
- Decal width/height are **fractions of the two larger box extents** (e.g. × `0.4`), with minimum clamps.
- These are **Three.js model units** tied to the authored GLB, not labeled as cm in code.

**Path B — Procedural fallback plane (`fallbackProceduralDecal`):**

- User **width / height / depth** from customization (stored as cm in product UX) are converted to scene units with **magic divisors** (`9.2`, `12.5`) and further multipliers (`0.5`, `0.28`, etc.).
- This ties the fallback quad **loosely** to chosen bag dimensions but is still **not** “uploaded image pixels → cm on leather.”

**Whole-model scale:**

- The bag group uses `scale={[sx, sy, sz]}` where `sx = customization.width / DEFAULT_WIDTH` (and similarly for height/depth).
- Changing bag cm **scales the entire model**, so the decal scales with the bag. That is **proportional scaling**, not a separate physical mapping for the photo.

### 3. User-controlled multiplier

- `frontPhotoScale` (see validation in `web/src/actions/product/customize-product.validation.ts`) multiplies the decal/plane size relative to the auto-fit baseline. It does **not** represent cm.

### 3b. Texture crop (zoom + framing)

- `frontPhotoCropZoom` (1…3) scales the source image when rasterizing into the square decal canvas (after the same “cover” baseline as `drawImageCover`), effectively **zooming in** and cropping edges.
- `frontPhotoCropPanU` / `frontPhotoCropPanV` (±1) shift the visible window when zoomed; they apply in **image/texture space**, independent of `frontPhotoPanU`/`V` (which move the decal on the bag mesh).

### Photo pan (sliders) vs size

- Tangent pan range scales with `frontPhotoScale` (`effectivePhotoPanScale` in `bag-textured-gltf-model.tsx`) so enlarging or shrinking the print still allows roughly reaching the bag front edges; the base pan radii are also higher than the original `0.42` heuristic.
- Fallback plane mode uses pan factor `≈ 0.92 × effectivePhotoScale` (replacing a fixed `0.4`). Normalized pan is clamped to about **±1.2** in validation and UI sliders. **Pan sliders** render on the 3D preview overlay, **directly below** the “Move photo on bag” / Done toolbar (`bag-3d-canvas.tsx`), not in the side panel.

### 4. Aspect ratio and distortion

- The texture is **square** (512×512 after cover crop).
- The decal **quad** is often **non-square** (`planeW` ≠ `planeH` on the surface path).
- Mapping the square texture onto a non-square projector can **stretch** the image unless UV/layout compensates. Natural photo aspect ratio on the physical bag is **not** guaranteed.

## Summary

| Question | Answer |
|----------|--------|
| Is there pixel → cm conversion? | **No.** |
| What sets default photo size? | Bbox heuristics (surface) or fallback formulas from bag cm → scene units (plane). |
| Does changing bag dimensions calibrate the photo in cm? | Only as **uniform scale** of the whole model; not per-photo print sizing. |
| Is the image aspect preserved on the bag? | **Not guaranteed**; square canvas + non-square decal can distort. |

## Possible future improvements

1. **Print area in cm** — Author or compute a “printable rectangle” on the front panel in cm; size the decal from that.
2. **Preserve aspect ratio** — Use a non-square canvas (or letterbox/`object-fit: contain`) and match decal aspect to texture aspect, or adjust UVs.
3. **Manufacturing export** — Store pan, scale, and printable bounds so production can reproduce placement independent of preview heuristics.
4. **Document GLB units** — If the model is authored in meters or cm, document it and thread that through placement math explicitly.

## Code references

- `web/src/components/customizer/bag-textured-gltf-model.tsx` — `drawImageCover`, `DECAL_CANVAS_SIZE`, `buildPhotoDecalTexture`, `computeFabricDecalPlacementInternal`, `fallbackProceduralDecal`, `photoDecalTransform` / `frontPhotoScale`.
- `web/src/components/customizer/customizer-controls.tsx` — upload UI and `frontPhotoScale` slider.
- `web/src/types/customizer.ts` — `DEFAULT_CUSTOMIZATION` including `frontPhotoScale`.
