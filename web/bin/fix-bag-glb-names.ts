#!/usr/bin/env bun

/**
 * Assigns riben.life-compatible mesh/node names per GUIDE-meshy-bag-glb-naming.md (`{Part}_{Material}`).
 *
 * - **Default file:** `public/models/bag-textured.glb` (matches `DEFAULT_CUSTOMIZER_GLB_PATH` in `product-customizer-glb.ts`).
 * - **Single merged mesh** (typical Meshy / scan export): names it `Body_Fabric` so
 *   `BagTexturedGltfModel` can resolve fabric geometry (e.g. decal placement heuristics).
 * - **Multiple meshes:** assigns names in canonical order, then `Mesh_Extra_N` for overflow.
 *
 * Uses @gltf-transform/core in-place rewrite (preserves buffers; no Three re-export).
 *
 * Run from `web/`:
 *   `bun run fix:bag-glb-names`
 *   `bun run fix:bag-glb-names -- yom2-2`
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Mesh, Node } from "@gltf-transform/core";
import { NodeIO } from "@gltf-transform/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, "..");

/** Default stem matches `DEFAULT_CUSTOMIZER_GLB_PATH` in `product-customizer-glb.ts`. */
const DEFAULT_STEM = "bag-textured";

function stemFromArgv(): string {
	const raw = process.argv.slice(2).find((a) => !a.startsWith("-"));
	if (!raw?.trim()) {
		return DEFAULT_STEM;
	}
	return raw.replace(/\.glb$/i, "").trim() || DEFAULT_STEM;
}

const GLB_PATH = join(WEB_ROOT, "public", "models", `${stemFromArgv()}.glb`);

/** Same order as GUIDE-meshy-bag-glb-naming.md (`{Part}_{Material}`) */
const CANONICAL_MESH_NAMES = [
	"Body_Front_Fabric",
	"Body_Back_Fabric",
	"Body_Side_L_Fabric",
	"Body_Side_R_Fabric",
	"Body_Bottom_Fabric",
	"TopBinding_Leather",
	"Flap_Main_Leather",
	"Handle_L_Leather",
	"Handle_R_Leather",
	"Corner_FL_Leather",
	"Corner_FR_Leather",
	"Corner_BL_Leather",
	"Corner_BR_Leather",
	"Snap_Metal",
] as const;

const SINGLE_MERGED_NAME = "Body_Fabric";

function collectMeshNodes(root: {
	listMeshes: () => Mesh[];
	listNodes: () => Node[];
}): { mesh: Mesh; nodes: Node[] }[] {
	const meshes = root.listMeshes();
	const out: { mesh: Mesh; nodes: Node[] }[] = [];
	for (const mesh of meshes) {
		out.push({ mesh, nodes: [] });
	}
	for (const node of root.listNodes()) {
		const mesh = node.getMesh();
		if (!mesh) {
			continue;
		}
		const entry = out.find((e) => e.mesh === mesh);
		if (entry) {
			entry.nodes.push(node);
		}
	}
	return out;
}

async function main(): Promise<void> {
	const io = new NodeIO();
	const document = await io.read(GLB_PATH);
	const root = document.getRoot();
	const meshNodes = collectMeshNodes(root);

	if (meshNodes.length === 0) {
		throw new Error(`No meshes found in ${GLB_PATH}`);
	}

	if (meshNodes.length === 1) {
		const { mesh, nodes } = meshNodes[0];
		mesh.setName(SINGLE_MERGED_NAME);
		for (const n of nodes) {
			n.setName(SINGLE_MERGED_NAME);
		}
		console.info(
			`Named single merged mesh + ${nodes.length} node(s) as "${SINGLE_MERGED_NAME}".`,
		);
	} else {
		meshNodes.forEach((entry, i) => {
			const name =
				CANONICAL_MESH_NAMES[i] ??
				`Mesh_Extra_${i - CANONICAL_MESH_NAMES.length}`;
			entry.mesh.setName(name);
			for (const n of entry.nodes) {
				n.setName(name);
			}
		});
		console.info(
			`Named ${meshNodes.length} meshes with canonical / extra names.`,
		);
	}

	const materials = root.listMaterials();
	if (materials.length === 1 && !materials[0].getName()) {
		materials[0].setName("Material_Fabric");
	}

	const scenes = root.listScenes();
	if (scenes.length > 0) {
		const children = scenes[0].listChildren();
		if (children.length === 1 && !children[0].getName()) {
			children[0].setName("Le_Bag");
		}
	}

	await io.write(GLB_PATH, document);
	console.info(`Updated: ${GLB_PATH}`);
}

main().catch((err: unknown) => {
	console.error(err);
	process.exit(1);
});
