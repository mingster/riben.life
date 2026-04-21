# Guide: Meshy.ai prompts for riben.life-compatible GLB naming

**Status:** Active
**Related:** [`bag-textured-gltf-model.tsx`](../src/components/customizer/bag-textured-gltf-model.tsx), [`fix-bag-glb-names.ts`](../bin/fix-bag-glb-names.ts)
**External:** [Meshy-5 Image to 3D — tips and workflows](https://www.meshy.ai/blog/meshy-5-image-to-3d) (Meshy blog)

## Overview

riben.life’s 3D customizer loads the GLB **with authored materials unchanged** and uses **mesh object names** for optional front-decal placement (e.g. finding the front body panel). Names follow **`{PartName}_{MaterialType}`**: logical part first, **material suffix last** (PascalCase, underscores).

**Examples:** `Body_Front_Leather`, `Corner_FR_Leather`, `Body_Back_Fabric`, `Snap_Metal`.

**Legacy:** Older assets may still use `Fabric_*` / `Leather_*` / `Metal_*` prefixes; the runtime still recognizes those until you rename.

## Deploying models per product (shop customizer)

- Place each file at **`web/public/models/{glbKey}.glb`** (served as `/models/{glbKey}.glb`).
- **`glbKey`**: the product’s **slug** when set; otherwise the product **id** (UUID). Example: slug `yom2` → `public/models/yom2.glb`.
- The PDP **Customize** button and `/shop/p/[productId]/customizer` only appear when that file exists (checked on the server). Initial bag dimensions default from **`ProductAttribute`** width / height / length (cm) when those values are positive.

## Meshy-5 Image → 3D: reference photo (before the prompt)

Meshy’s own guidance applies **before** you paste the naming prompt below. A better source image usually means cleaner geometry and textures in the GLB. Summary from [Meshy’s Meshy-5 guide](https://www.meshy.ai/blog/meshy-5-image-to-3d):

Change to [Hitem3D](https://www.hitem3d.ai/).

| Do | Avoid |
|----|--------|
| **High-resolution** input (blog suggests **> 1040×1040** when possible) | Low-res, blurry, or muddy detail |
| **Plain / removed background** (Meshy background remover or pre-cut PNG) | Busy backgrounds, weak object vs background contrast |
| **Single clear subject** (one bag, full silhouette readable) | Multiple separate objects in one frame |
| **Well-lit, clean** image; whole object visible | Heavy fog, smoke, particles obscuring form |
| **Front-facing** hero shot for “character-like” products (bags read well head-on) | Text or logos *in* the photo as primary structure (confuses reconstruction) |
| **Iterate** — run the same image several times | Assuming the first generation is the best |

**Workflow ideas from the same post:** clean up a weak photo first (contrast, sharpness, background) in another tool — the blog suggests a generic cleanup brief such as *tidy up contrast, clarity, sharpness, remove background for Image to 3D, keep the look*; or use **text-to-image → Image to 3D** for hard concepts; for large environments, generate **small chunks** and assemble in Blender — less relevant for a single bag, but useful if you expand scope.

**Meshy-4 vs Meshy-5 (blog):** Meshy-5 tends to offer **sharper geometry and cleaner, more relightable PBR textures**; Meshy-4 is described as **more stable** with fewer hollow/broken meshes. Prefer **Meshy-4** when you need predictable structure; use **Meshy-5** when you want maximum detail and can tolerate cleanup (see Blender section below).

## Naming rule: `{PartName}_{MaterialType}`

| Piece | Meaning |
|-------|---------|
| **PartName** | Logical component (which surface or hardware). Use **PascalCase**; separate words with `_`. |
| **MaterialType** | Dominant material for that mesh: `_Fabric`, `_Leather`, `_Metal`, etc. Same PascalCase rule. |

**Why suffix material?** Part identity stays stable when you swap materials (e.g. `Body_Front_Leather` vs `Body_Front_Fabric`); tooling and heuristics can key off **`Body_Front`** via `name.startsWith("Body_Front_")` or split on the last `_` if you add more tokens later.

**Reserved material suffixes (recommended):**

| Suffix | Use |
|--------|-----|
| `_Fabric` | Main textile / canvas shell panels |
| `_Leather` | Trim, straps, binding, corners, flaps (leather or leather-like) |
| `_Metal` | Hardware (snaps, feet, buckles if split out) |

Add `_Rubber`, `_Plastic`, etc. if a part needs its own mesh and material family.

## What the app expects (contract)

`BagTexturedGltfModel` resolves the **front decal** by mesh name:

1. Prefer any mesh whose name **starts with** `Body_Front_` (e.g. `Body_Front_Leather`, `Body_Front_Fabric`).
2. Else fall back to legacy **`Fabric_Front`** or other **`Fabric_*`** meshes (see `findFrontFabricMesh` in `bag-textured-gltf-model.tsx`).

Materials should be **glTF 2.0 PBR** (metallic-roughness), compatible with Three.js `MeshStandardMaterial`. Base color textures are optional.

## Canonical mesh names (Part_Material)

Use **exact** part tokens below; choose **`_Fabric` vs `_Leather`** per mesh to match what that geometry actually is (your reference photo / design).

### Main shell (typically `_Fabric` or `_Leather` per panel)

- `Body_Front_Fabric` or `Body_Front_Leather`
- `Body_Back_Fabric` or `Body_Back_Leather`
- `Body_Side_L_Fabric` or `Body_Side_L_Leather`
- `Body_Side_R_Fabric` or `Body_Side_R_Leather`
- `Body_Bottom_Fabric` or `Body_Bottom_Leather`
- Optional: `Body_Top_Fabric` / `Body_Top_Leather`

### Trim, straps, reinforcements (`_Leather`)

- `TopBinding_Leather`
- `Flap_Main_Leather`
- `Handle_L_Leather`
- `Handle_R_Leather`
- `Corner_FL_Leather`, `Corner_FR_Leather`, `Corner_BL_Leather`, `Corner_BR_Leather`

### Hardware (`_Metal`)

- `Snap_Metal`

### Single merged mesh (typical Meshy / photogrammetry export)

If the file contains **one** combined mesh, name it **`Body_Fabric`** or **`Body_Leather`** depending on the dominant surface. The runtime still treats `Fabric_Body` and legacy **`Body_Body_*`** as older merged names.

**In this repo:** from `web/`, run `bun run fix:bag-glb-names` to assign canonical **`Part_Material`** names (single merged mesh → `Body_Fabric`) in the default demo file [`public/models/bag-textured.glb`](../public/models/bag-textured.glb). For another file (e.g. a product key `yom2`), pass the stem: `bun run fix:bag-glb-names -- yom2-2`.

**Optional extras:** Same pattern, e.g. `Flap_Tip_Leather`, `Buckle_Main_Metal`.

**Scene hierarchy:** A root such as `Le_Bag` (set by the fix script when the scene has a single unnamed child) is optional. Parent empties are fine as long as **leaf mesh objects** keep the naming rule above.

**Critical:** If everything merges into **one** mesh, front-decal placement is less precise (bbox heuristics). Prefer **separate meshes** per logical part, especially a dedicated **`Body_Front_*`** for monogram alignment.

---

## Copy-paste prompt for Meshy.ai

Use as the **main prompt**; adjust the first sentence for your art direction. Swap `_Fabric` / `_Leather` on body lines if your bag shell is leather.

```text
3D model of a structured tote bag.

CRITICAL — NAMING FOR EXPORT (glTF/GLB):
- Format: {PartName}_{MaterialType} — part first, material suffix last (PascalCase, underscores).
- Export as a single GLB with SEPARATE mesh objects for each part (do NOT merge unrelated materials into one mesh if you can avoid it).
- Every mesh object MUST use EXACT names from the lists below (pick _Fabric or _Leather on body panels as appropriate).

MAIN SHELL (example with fabric body; use Body_*_Leather if the shell is leather):
  Body_Front_Fabric, Body_Back_Fabric, Body_Side_L_Fabric, Body_Side_R_Fabric, Body_Bottom_Fabric
  Optional: Body_Top_Fabric

TRIM AND STRAPS (leather):
  TopBinding_Leather, Flap_Main_Leather, Handle_L_Leather, Handle_R_Leather,
  Corner_FL_Leather, Corner_FR_Leather, Corner_BL_Leather, Corner_BR_Leather

HARDWARE (metal):
  Snap_Metal

- Use glTF 2.0 PBR materials (metallic-roughness). Distinct materials per part where possible.
- Do not use generic names (Mesh, Cube, Object) for final export.
- Scene root may be Le_Bag; empties for grouping are OK if leaf meshes keep the exact Part_Material names.

Purpose: downstream app finds the front panel via names starting with Body_Front_ (or legacy Fabric_Front) and keeps glTF materials as authored.
```

### Negative / constraint add-on (if the tool supports it)

```text
Avoid: one mesh for the entire bag; names without a material suffix; generic object names; vertex colors only without PBR materials.
```

---

## Reality check

Generators like Meshy.ai **do not always** honor object naming or mesh separation in the exported GLB. Treat the prompt as **best effort**; plan for manual or scripted cleanup.

**Meshy-5 preview:** Users sometimes see **hollow geometry, incomplete structure, or inconsistent runs**; repeating generation and fixing the **source image** (background, resolution, lighting) usually helps more than prompt tweaks alone — see [Meshy’s tips](https://www.meshy.ai/blog/meshy-5-image-to-3d).

### Optional code follow-up

If you must support arbitrary exports without renaming, extend `bag-textured-gltf-model.tsx` (e.g. `findFrontFabricMesh` or a small **JSON manifest** mapping part IDs to roles). The default riben.life path assumes the naming contract above. GLB materials are shown as authored; runtime tinting is not applied by default.

---

## Blender fallback: split, rename, export

Use when the GLB has merged meshes or wrong names.

1. **Import:** File → Import → glTF 2.0 (.glb/.gltf).
2. **Inspect:** Outliner — expand the scene; select each mesh and note current names.
3. **Split (if one mesh):** Enter Edit Mode, select faces by material or island, `P` → Separate → Selection. Repeat until logical parts are separate objects.
4. **Rename:** Set each object to **`PartName_MaterialType`** (e.g. `Body_Front_Leather`, `Corner_FR_Leather`). Match casing exactly.
5. **Materials:** Ensure fabric vs leather vs metal use distinct materials (PBR); material *names* can differ from object names.
6. **Export:** File → Export → glTF 2.0 (.glb). Enable **Selected Objects** if you only want the bag.

### Alternative tooling

- **glTF Transform** (CLI): inspect with `gltf-transform inspect model.glb`; merge/split primitives as needed with custom scripts.
- Re-export from Blender after rename for the simplest path.

---

## Verification checklist (before deploying a bag GLB)

Use this after Meshy export or Blender cleanup, before copying into `web/public/models/{glbKey}.glb` (see **Deploying models per product (shop customizer)** above for `glbKey`).

1. Open the GLB in **Blender** (or a viewer that shows object names).
2. Confirm **each** main part is a **separate object** named **`Something_Material`** (at least one underscore; material suffix is `_Fabric`, `_Leather`, `_Metal`, or your documented token).
3. Confirm **front panel** exists as **`Body_Front_Fabric`** or **`Body_Front_Leather`** (or legacy **`Fabric_Front`**).
4. Load the app **Customizer** with the textured model and verify:
   - Bag renders with **GLB materials** as exported (no runtime retint of body/trim/hardware).
   - Optional monogram / front image decal sits on the front panel when names allow.
5. Run `bun run dev` and open the customized page; confirm no console errors from `useGLTF`.

If anything is merged or misnamed, return to Blender rename/split steps, then re-export GLB.

---

## Summary

- **Upstream:** Strong **reference images** (resolution, background, single subject, lighting) improve Meshy-5 outputs; see [Meshy’s Image to 3D guide](https://www.meshy.ai/blog/meshy-5-image-to-3d). Choose **Meshy-4 vs Meshy-5** based on stability vs detail.
- **Must have:** Names like **`{Part}_{Material}`** (e.g. `Body_Front_Leather`, `Corner_FR_Leather`); **separate meshes** where you need reliable **`Body_Front_*`** decal placement.
- **Best have:** Exact canonical parts above + consistent suffixes (`_Fabric`, `_Leather`, `_Metal`).
- **Legacy:** `Fabric_*` / `Fabric_Front` still supported in code for existing GLBs.
- **If the tool fails:** Blender rename/split → re-export GLB → verify checklist → deploy to `public/models/{glbKey}.glb`, then run `bun run fix:bag-glb-names -- {glbKey}` if meshes need canonical names.
