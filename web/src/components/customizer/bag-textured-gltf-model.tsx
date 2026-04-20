"use client";

import { Decal, useGLTF } from "@react-three/drei";
import {
	type RefObject,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import * as THREE from "three";
import type { BagCustomization } from "@/types/customizer";
import { BagDimensionGuides } from "./bag-dimension-guides";

/**
 * Compact fingerprint for data URLs: JPEG/WebPNG prefixes share the same first ~50 chars, so
 * `slice(0, 48)` collides across crops — Decal keys and texture updates must see real changes.
 */
function frontImageDataUrlKey(url: string | undefined | null): string {
	if (!url?.trim()) {
		return "";
	}
	const u = url.trim();
	return `${u.length}:${u.slice(-56)}`;
}

/** Push ray start along hint normal (multiples of mesh extent) + tiny offset past hit to reduce z-fighting. */
const RAYCAST_PUSH_FACTOR = 2.8;
const SURFACE_OFFSET_ALONG_NORMAL = 0.0025;

/**
 * Resolves the mesh used for front decal / raycast. Prefers `Body_Front_*` ({Part}_{Material}),
 * then legacy `Fabric_Front`, merged `Body_Fabric` / `Body_Leather` / legacy `Body_Body_*` / `Fabric_Body`, `Mesh_Extra_*` (tool overflow),
 * then other `Fabric_*`. If none match, falls back to the largest mesh by local bbox volume
 * (handles generic GLB names like `Mesh_0`).
 */
function findFrontFabricMesh(root: THREE.Object3D): THREE.Mesh | null {
	const meshes: THREE.Mesh[] = [];
	root.traverse((o) => {
		if (!(o instanceof THREE.Mesh)) {
			return;
		}
		const n = o.name;
		if (
			n.startsWith("Body_Front_") ||
			n === "Fabric_Front" ||
			n.startsWith("Fabric_") ||
			n === "Fabric_Body" ||
			n === "Body_Fabric" ||
			n === "Body_Leather" ||
			n.startsWith("Body_Body_") ||
			n.startsWith("Mesh_Extra_")
		) {
			meshes.push(o);
		}
	});
	const byPartMaterial = meshes.find((m) => m.name.startsWith("Body_Front_"));
	if (byPartMaterial) {
		return byPartMaterial;
	}
	const legacyFront = meshes.find((m) => m.name === "Fabric_Front");
	if (legacyFront) {
		return legacyFront;
	}
	const merged = meshes.find(
		(m) =>
			m.name === "Fabric_Body" ||
			m.name === "Body_Fabric" ||
			m.name === "Body_Leather" ||
			m.name.startsWith("Body_Body_"),
	);
	if (merged) {
		return merged;
	}
	const extra = meshes.find((m) => m.name.startsWith("Mesh_Extra_"));
	if (extra) {
		return extra;
	}
	const notBack = meshes.find(
		(m) => !m.name.includes("Back") && !m.name.includes("Bottom"),
	);
	if (notBack) {
		return notBack;
	}
	if (meshes[0]) {
		return meshes[0];
	}

	const all: THREE.Mesh[] = [];
	root.traverse((o) => {
		if (o instanceof THREE.Mesh) {
			all.push(o);
		}
	});
	if (all.length === 0) {
		return null;
	}
	let best = all[0];
	let bestVol = -1;
	for (const m of all) {
		const g = m.geometry;
		if (!g.boundingBox) {
			g.computeBoundingBox();
		}
		const bb = g.boundingBox;
		if (!bb) {
			continue;
		}
		const s = new THREE.Vector3();
		bb.getSize(s);
		const vol = s.x * s.y * s.z;
		if (vol > bestVol) {
			bestVol = vol;
			best = m;
		}
	}
	return best;
}

type Axis = "x" | "y" | "z";

/**
 * Bbox gives a coarse outward hint; raycast finds the real triangle hit + shading normal so the
 * decal sits on the surface (organic / photogrammetry meshes are not axis-aligned boxes).
 */
function raycastFrontSurface(
	mesh: THREE.Mesh,
	hintNormalWorld: THREE.Vector3,
	hintPointWorld: THREE.Vector3,
	extentWorld: number,
): { pointWorld: THREE.Vector3; normalWorld: THREE.Vector3 } | null {
	mesh.updateWorldMatrix(true, true);
	const raycaster = new THREE.Raycaster();
	const push = Math.max(extentWorld * RAYCAST_PUSH_FACTOR, 0.15);
	const hint = hintNormalWorld.clone().normalize();

	const tryDir = (dir: THREE.Vector3): THREE.Intersection | null => {
		const origin = hintPointWorld.clone().addScaledVector(dir, push);
		const direction = dir.clone().negate().normalize();
		raycaster.set(origin, direction);
		const hits = raycaster.intersectObject(mesh, false);
		return hits[0] ?? null;
	};

	let hit = tryDir(hint);
	if (!hit) {
		hit = tryDir(hint.clone().negate());
	}
	if (!hit?.face) {
		return null;
	}

	const normalWorld = hit.face.normal
		.clone()
		.transformDirection(hit.object.matrixWorld)
		.normalize();
	if (normalWorld.dot(hint) < 0) {
		normalWorld.negate();
	}

	const pointWorld = hit.point
		.clone()
		.addScaledVector(normalWorld, SURFACE_OFFSET_ALONG_NORMAL);

	return { pointWorld, normalWorld };
}

/**
 * Placement in the fabric mesh's local space for drei's Decal (DecalGeometry projects onto parent geometry).
 */
export type FabricSurfaceDecalPlacement = {
	position: [number, number, number];
	rotation: [number, number, number];
	scale: [number, number, number];
};

/**
 * Tangent offset per pan ±1 (mesh-local), before multiplying by `frontPhotoScale`.
 * Larger base + scale factor lets the print reach panel edges when zoomed in/out with size slider.
 */
const PHOTO_PAN_RADIUS_U = 0.58;

/** Min scale from product UI (matches customize-product.validation). */
const PHOTO_SCALE_MIN = 0.35;

/** Matches slider ±120 → ±1.2 in `bag-3d-canvas.tsx`. */
const PHOTO_PAN_V_EXTENT = 1.2;

function effectivePhotoPanScale(photoScale: number): number {
	return Math.max(photoScale, PHOTO_SCALE_MIN);
}

/** Min/max of mesh bbox corners projected onto a unit axis (mesh local space). */
function meshBBoxProjectionOnAxis(
	box: THREE.Box3,
	axis: THREE.Vector3,
): { min: number; max: number } {
	const corners: [number, number, number][] = [
		[box.min.x, box.min.y, box.min.z],
		[box.max.x, box.min.y, box.min.z],
		[box.min.x, box.max.y, box.min.z],
		[box.max.x, box.max.y, box.min.z],
		[box.min.x, box.min.y, box.max.z],
		[box.max.x, box.min.y, box.max.z],
		[box.min.x, box.max.y, box.max.z],
		[box.max.x, box.max.y, box.max.z],
	];
	let min = Infinity;
	let max = -Infinity;
	for (const [x, y, z] of corners) {
		const s = x * axis.x + y * axis.y + z * axis.z;
		min = Math.min(min, s);
		max = Math.max(max, s);
	}
	return { min, max };
}

/**
 * Vertical pan: panV = -extent → decal bottom edge on panel bottom; panV = +extent → top on top;
 * panV = 0 → auto (raycast) vertical center. Piecewise linear via `baseTy`.
 */
function targetCenterTyFromPanV(
	panV: number,
	baseTy: number,
	panelMin: number,
	panelMax: number,
	halfDecalH: number,
): number {
	const bottomCenter = panelMin + halfDecalH;
	const topCenter = panelMax - halfDecalH;
	const pv = THREE.MathUtils.clamp(
		panV,
		-PHOTO_PAN_V_EXTENT,
		PHOTO_PAN_V_EXTENT,
	);
	if (pv <= 0) {
		const t = (pv + PHOTO_PAN_V_EXTENT) / PHOTO_PAN_V_EXTENT;
		return THREE.MathUtils.lerp(bottomCenter, baseTy, t);
	}
	const t = pv / PHOTO_PAN_V_EXTENT;
	return THREE.MathUtils.lerp(baseTy, topCenter, t);
}

function panVFromTargetCenterTy(
	targetTy: number,
	baseTy: number,
	panelMin: number,
	panelMax: number,
	halfDecalH: number,
): number {
	const bottomCenter = panelMin + halfDecalH;
	const topCenter = panelMax - halfDecalH;
	if (targetTy <= baseTy) {
		if (Math.abs(baseTy - bottomCenter) < 1e-8) {
			return -PHOTO_PAN_V_EXTENT;
		}
		const t = (targetTy - bottomCenter) / (baseTy - bottomCenter);
		return THREE.MathUtils.clamp(
			-PHOTO_PAN_V_EXTENT + t * PHOTO_PAN_V_EXTENT,
			-PHOTO_PAN_V_EXTENT,
			0,
		);
	}
	if (Math.abs(topCenter - baseTy) < 1e-8) {
		return PHOTO_PAN_V_EXTENT;
	}
	const t = (targetTy - baseTy) / (topCenter - baseTy);
	return THREE.MathUtils.clamp(t * PHOTO_PAN_V_EXTENT, 0, PHOTO_PAN_V_EXTENT);
}

function computeFabricDecalPlacementInternal(
	frontMesh: THREE.Mesh,
): FabricSurfaceDecalPlacement {
	frontMesh.updateWorldMatrix(true, true);

	const geom = frontMesh.geometry;
	if (!geom.boundingBox) {
		geom.computeBoundingBox();
	}
	const box = geom.boundingBox;
	if (!box) {
		return {
			position: [0, 0, 0],
			rotation: [0, 0, 0],
			scale: [0.2, 0.12, 0.1],
		};
	}

	const size = new THREE.Vector3();
	box.getSize(size);
	const center = new THREE.Vector3();
	box.getCenter(center);

	const dims = (
		[
			{ axis: "x" as const, len: size.x },
			{ axis: "y" as const, len: size.y },
			{ axis: "z" as const, len: size.z },
		] as { axis: Axis; len: number }[]
	).filter((d) => d.len > 1e-8);
	dims.sort((a, b) => a.len - b.len);
	const thickAxis: Axis = dims[0]?.axis ?? "z";

	const normalLocal = new THREE.Vector3();
	const faceCenterLocal = center.clone();

	const useMax =
		frontMesh.name !== "Fabric_Back" &&
		!frontMesh.name.includes("Back") &&
		!frontMesh.name.startsWith("Body_Back_");

	if (thickAxis === "z") {
		normalLocal.set(0, 0, useMax ? 1 : -1);
		faceCenterLocal.set(center.x, center.y, useMax ? box.max.z : box.min.z);
	} else if (thickAxis === "x") {
		normalLocal.set(useMax ? 1 : -1, 0, 0);
		faceCenterLocal.set(useMax ? box.max.x : box.min.x, center.y, center.z);
	} else {
		normalLocal.set(0, useMax ? 1 : -1, 0);
		faceCenterLocal.set(center.x, useMax ? box.max.y : box.min.y, center.z);
	}

	const rayTargetWorld = center.clone().applyMatrix4(frontMesh.matrixWorld);

	const normalWorldHint = normalLocal
		.clone()
		.transformDirection(frontMesh.matrixWorld)
		.normalize();

	const meshScale = new THREE.Vector3();
	frontMesh.matrixWorld.decompose(
		new THREE.Vector3(),
		new THREE.Quaternion(),
		meshScale,
	);
	const extentWorld =
		Math.max(
			size.x * meshScale.x,
			size.y * meshScale.y,
			size.z * meshScale.z,
		) || 0.2;

	const surface = raycastFrontSurface(
		frontMesh,
		normalWorldHint,
		rayTargetWorld,
		extentWorld,
	);

	let pointWorld: THREE.Vector3;
	let normalWorld: THREE.Vector3;
	if (surface) {
		pointWorld = surface.pointWorld;
		normalWorld = surface.normalWorld;
	} else {
		pointWorld = faceCenterLocal
			.clone()
			.addScaledVector(normalLocal, SURFACE_OFFSET_ALONG_NORMAL)
			.applyMatrix4(frontMesh.matrixWorld);
		normalWorld = normalWorldHint;
	}

	const invMeshWorld = new THREE.Matrix4().copy(frontMesh.matrixWorld).invert();
	const positionLocal = pointWorld.clone().applyMatrix4(invMeshWorld);

	const decalWorldQuat = new THREE.Quaternion().setFromUnitVectors(
		new THREE.Vector3(0, 0, 1),
		normalWorld,
	);
	const fabricWorldQuat = new THREE.Quaternion();
	frontMesh.getWorldQuaternion(fabricWorldQuat);
	const localQuat = fabricWorldQuat.clone().invert().multiply(decalWorldQuat);
	const euler = new THREE.Euler().setFromQuaternion(localQuat, "XYZ");

	const sorted = [size.x, size.y, size.z].sort((a, b) => b - a);
	const planeW = Math.max(sorted[0] * 0.4, 0.06);
	const planeH = Math.max(sorted[1] * 0.4, 0.05);
	const thin = sorted[2] > 1e-6 ? sorted[2] : sorted[1] * 0.2;
	const depth = Math.max(thin * 1.35, 0.06);

	return {
		position: [positionLocal.x, positionLocal.y, positionLocal.z],
		rotation: [euler.x, euler.y, euler.z],
		scale: [planeW, planeH, depth],
	};
}

/** Auto fabric placement; export for 3D photo drag (raycast → pan). */
export function computeFabricDecalPlacement(
	frontMesh: THREE.Mesh,
): FabricSurfaceDecalPlacement {
	return computeFabricDecalPlacementInternal(frontMesh);
}

/**
 * Maps a fabric hit (world) to normalized pan values relative to auto placement.
 */
export function hitPointToPhotoPan(
	fabricMesh: THREE.Mesh,
	hitPointWorld: THREE.Vector3,
	base: FabricSurfaceDecalPlacement,
	photoScale = 1,
): { panU: number; panV: number } {
	fabricMesh.updateWorldMatrix(true, true);
	const hitLocal = fabricMesh.worldToLocal(hitPointWorld.clone());
	const basePos = new THREE.Vector3(...base.position);
	const delta = hitLocal.clone().sub(basePos);
	const euler = new THREE.Euler(
		base.rotation[0],
		base.rotation[1],
		base.rotation[2],
		"XYZ",
	);
	const q = new THREE.Quaternion().setFromEuler(euler);
	const tx = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
	const ty = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
	const ps = effectivePhotoPanScale(photoScale);
	const denomU = base.scale[0] * PHOTO_PAN_RADIUS_U * ps;
	const panU = THREE.MathUtils.clamp(
		delta.dot(tx) / Math.max(denomU, 1e-6),
		-PHOTO_PAN_V_EXTENT,
		PHOTO_PAN_V_EXTENT,
	);

	const geom = fabricMesh.geometry;
	if (!geom.boundingBox) {
		geom.computeBoundingBox();
	}
	const box = geom.boundingBox;
	if (!box) {
		return { panU, panV: 0 };
	}
	const span = meshBBoxProjectionOnAxis(box, ty);
	const panelMin = span.min;
	const panelMax = span.max;
	const panelSpan = panelMax - panelMin;
	const decalH = base.scale[1];
	let halfDecalH = decalH / 2;
	if (panelSpan < decalH - 1e-6) {
		halfDecalH = Math.max(panelSpan / 2, 1e-6);
	}
	const baseTy = basePos.dot(ty);
	const targetTy = hitLocal.dot(ty);
	const panV = panVFromTargetCenterTy(
		targetTy,
		baseTy,
		panelMin,
		panelMax,
		halfDecalH,
	);

	return { panU, panV };
}

function computePhotoDecalPlacementWithPan(
	frontMesh: THREE.Mesh,
	base: FabricSurfaceDecalPlacement,
	panU: number,
	panV: number,
	photoScale: number,
): FabricSurfaceDecalPlacement {
	if (Math.abs(panU) < 1e-5 && Math.abs(panV) < 1e-5) {
		return base;
	}
	frontMesh.updateWorldMatrix(true, true);
	const euler = new THREE.Euler(
		base.rotation[0],
		base.rotation[1],
		base.rotation[2],
		"XYZ",
	);
	const q = new THREE.Quaternion().setFromEuler(euler);
	const tx = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
	const ty = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
	const ps = effectivePhotoPanScale(photoScale);
	const rU = PHOTO_PAN_RADIUS_U * ps;
	const basePos = new THREE.Vector3(...base.position);
	const baseTy = basePos.dot(ty);

	const geom0 = frontMesh.geometry;
	if (!geom0.boundingBox) {
		geom0.computeBoundingBox();
	}
	const box0 = geom0.boundingBox;
	if (!box0) {
		return base;
	}
	const span0 = meshBBoxProjectionOnAxis(box0, ty);
	const panelMin = span0.min;
	const panelMax = span0.max;
	const panelSpan = panelMax - panelMin;
	const decalH = base.scale[1];
	let halfDecalH = decalH / 2;
	if (panelSpan < decalH - 1e-6) {
		halfDecalH = Math.max(panelSpan / 2, 1e-6);
	}

	const pos = basePos.clone();
	pos.addScaledVector(tx, panU * base.scale[0] * rU);
	if (Math.abs(panV) > 1e-6) {
		const targetTy = targetCenterTyFromPanV(
			panV,
			baseTy,
			panelMin,
			panelMax,
			halfDecalH,
		);
		pos.addScaledVector(ty, targetTy - baseTy);
	}

	const fabricWorldQuat = new THREE.Quaternion();
	frontMesh.getWorldQuaternion(fabricWorldQuat);
	const decalWorldQuat = fabricWorldQuat.clone().multiply(q);
	const normalWorld = new THREE.Vector3(0, 0, 1)
		.applyQuaternion(decalWorldQuat)
		.normalize();
	const posWorld = pos.clone().applyMatrix4(frontMesh.matrixWorld);

	const geom = frontMesh.geometry;
	if (!geom.boundingBox) {
		geom.computeBoundingBox();
	}
	const box = geom.boundingBox;
	if (!box) {
		return base;
	}
	const size = new THREE.Vector3();
	box.getSize(size);
	const meshScale = new THREE.Vector3();
	frontMesh.matrixWorld.decompose(
		new THREE.Vector3(),
		new THREE.Quaternion(),
		meshScale,
	);
	const extentWorld =
		Math.max(
			size.x * meshScale.x,
			size.y * meshScale.y,
			size.z * meshScale.z,
		) || 0.2;

	const surface = raycastFrontSurface(
		frontMesh,
		normalWorld,
		posWorld,
		extentWorld,
	);
	if (!surface) {
		return base;
	}

	const invMeshWorld = new THREE.Matrix4().copy(frontMesh.matrixWorld).invert();
	const positionLocal = surface.pointWorld.clone().applyMatrix4(invMeshWorld);

	const normalWorldHit = surface.normalWorld;
	const decalWorldQuat2 = new THREE.Quaternion().setFromUnitVectors(
		new THREE.Vector3(0, 0, 1),
		normalWorldHit,
	);
	const fabricWorldQuat2 = new THREE.Quaternion();
	frontMesh.getWorldQuaternion(fabricWorldQuat2);
	const localQuat = fabricWorldQuat2.clone().invert().multiply(decalWorldQuat2);
	const euler2 = new THREE.Euler().setFromQuaternion(localQuat, "XYZ");

	return {
		position: [positionLocal.x, positionLocal.y, positionLocal.z],
		rotation: [euler2.x, euler2.y, euler2.z],
		scale: base.scale,
	};
}

function fallbackProceduralDecal(customization: BagCustomization): {
	position: [number, number, number];
	quaternion: [number, number, number, number];
	planeW: number;
	planeH: number;
} {
	const w = customization.width / 9.2;
	const h = customization.height / 9.2;
	const d = customization.depth / 12.5;
	const bodyH = h * 0.94;
	return {
		position: [0, 0, d / 2 + 0.04],
		quaternion: [0, 0, 0, 1],
		planeW: w * 0.5,
		planeH: bodyH * 0.28,
	};
}

const DECAL_CANVAS_SIZE = 512;

/** When a photo decal exists, monogram uses a smaller projector so type reads as a centered patch. */
const MONOGRAM_DECAL_RELATIVE_SCALE = 0.42;

function drawImageCover(
	ctx: CanvasRenderingContext2D,
	img: HTMLImageElement,
	dx: number,
	dy: number,
	dWidth: number,
	dHeight: number,
	cropZoom = 1,
	cropPanU = 0,
	cropPanV = 0,
): void {
	const iw = img.naturalWidth || img.width;
	const ih = img.naturalHeight || img.height;
	if (iw <= 0 || ih <= 0) {
		return;
	}
	const z = Math.max(1, cropZoom);
	const scale0 = Math.max(dWidth / iw, dHeight / ih);
	const scale = scale0 * z;
	const dw = iw * scale;
	const dh = ih * scale;
	const ox0 = dx + (dWidth - dw) / 2;
	const oy0 = dy + (dHeight - dh) / 2;
	const maxPanX = Math.max(0, (dw - dWidth) / 2);
	const maxPanY = Math.max(0, (dh - dHeight) / 2);
	const ox = ox0 - cropPanU * maxPanX;
	const oy = oy0 - cropPanV * maxPanY;
	ctx.drawImage(img, 0, 0, iw, ih, ox, oy, dw, dh);
}

function canvasToTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.needsUpdate = true;
	tex.minFilter = THREE.LinearFilter;
	tex.magFilter = THREE.LinearFilter;
	tex.generateMipmaps = false;
	return tex;
}

function drawInitialsOnCanvas(
	ctx: CanvasRenderingContext2D,
	customization: BagCustomization,
	size: number,
): void {
	const text = customization.initials.trim();
	if (!text) {
		return;
	}
	ctx.save();
	ctx.font = `bold ${Math.min(customization.initialsFontSize * 2.4, 160)}px "Times New Roman", Georgia, serif`;
	ctx.fillStyle = customization.initialsColor;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.shadowColor = "rgba(0,0,0,0.35)";
	ctx.shadowBlur = 8;
	ctx.shadowOffsetX = 1;
	ctx.shadowOffsetY = 1;
	ctx.fillText(text.toUpperCase(), size / 2, size / 2);
	ctx.restore();
}

/** Photo-only texture for surface `Decal` (conforms to mesh). */
function buildPhotoDecalTexture(
	uploadedImage: HTMLImageElement | null,
	cropZoom: number,
	cropPanU: number,
	cropPanV: number,
): THREE.CanvasTexture | null {
	const hasImg =
		uploadedImage?.complete &&
		(uploadedImage.naturalWidth || uploadedImage.width) > 0;
	if (!hasImg || !uploadedImage) {
		return null;
	}
	const canvas = document.createElement("canvas");
	canvas.width = DECAL_CANVAS_SIZE;
	canvas.height = DECAL_CANVAS_SIZE;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return null;
	}
	ctx.clearRect(0, 0, DECAL_CANVAS_SIZE, DECAL_CANVAS_SIZE);
	drawImageCover(
		ctx,
		uploadedImage,
		0,
		0,
		DECAL_CANVAS_SIZE,
		DECAL_CANVAS_SIZE,
		cropZoom,
		cropPanU,
		cropPanV,
	);
	return canvasToTexture(canvas);
}

/** Initials-only texture (transparent outside glyphs) for surface `Decal`. */
function buildInitialsDecalTexture(
	customization: BagCustomization,
): THREE.CanvasTexture | null {
	const text = customization.initials.trim();
	if (!text) {
		return null;
	}
	const canvas = document.createElement("canvas");
	canvas.width = DECAL_CANVAS_SIZE;
	canvas.height = DECAL_CANVAS_SIZE;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return null;
	}
	ctx.clearRect(0, 0, DECAL_CANVAS_SIZE, DECAL_CANVAS_SIZE);
	drawInitialsOnCanvas(ctx, customization, DECAL_CANVAS_SIZE);
	return canvasToTexture(canvas);
}

/** Single combined texture for procedural fallback plane (no Fabric mesh). */
function buildCompositeFallbackTexture(
	customization: BagCustomization,
	uploadedImage: HTMLImageElement | null,
): THREE.CanvasTexture | null {
	const text = customization.initials.trim();
	const hasImg =
		uploadedImage?.complete &&
		(uploadedImage.naturalWidth || uploadedImage.width) > 0;
	if (!text && !hasImg) {
		return null;
	}
	const canvas = document.createElement("canvas");
	canvas.width = DECAL_CANVAS_SIZE;
	canvas.height = DECAL_CANVAS_SIZE;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return null;
	}
	ctx.clearRect(0, 0, DECAL_CANVAS_SIZE, DECAL_CANVAS_SIZE);
	if (hasImg && uploadedImage) {
		drawImageCover(
			ctx,
			uploadedImage,
			0,
			0,
			DECAL_CANVAS_SIZE,
			DECAL_CANVAS_SIZE,
			customization.frontPhotoCropZoom ?? 1,
			customization.frontPhotoCropPanU ?? 0,
			customization.frontPhotoCropPanV ?? 0,
		);
	}
	drawInitialsOnCanvas(ctx, customization, DECAL_CANVAS_SIZE);
	return canvasToTexture(canvas);
}

function initialsDecalScale(
	baseScale: [number, number, number],
	hasPhotoDecal: boolean,
): [number, number, number] {
	const [w, h, d] = baseScale;
	if (!hasPhotoDecal) {
		return baseScale;
	}
	const k = MONOGRAM_DECAL_RELATIVE_SCALE;
	return [Math.max(w * k, 0.04), Math.max(h * k, 0.035), d];
}

type SurfaceDecalPlacement = {
	mode: "surface";
	position: [number, number, number];
	rotation: [number, number, number];
	scale: [number, number, number];
};

type FallbackPlanePlacement = {
	mode: "plane";
	position: [number, number, number];
	quaternion: [number, number, number, number];
	planeW: number;
	planeH: number;
};

type DecalPlacementState = SurfaceDecalPlacement | FallbackPlanePlacement;

interface BagTexturedGltfModelProps {
	/** Public URL for the GLB under `public/models/` (e.g. `/models/bag-textured.glb` or `/models/{productSlug}.glb`). */
	glbUrl: string;
	customization: BagCustomization;
	/** Report front fabric mesh for raycast-based photo drag (optional). */
	onFabricMeshReady?: (mesh: THREE.Mesh | null) => void;
	/** When true, draw width / height / depth guides around the scaled bag. */
	showDimensions?: boolean;
	/** Format numeric cm for dimension labels (i18n). */
	formatDimensionLabel?: (value: number) => string;
}

/**
 * Loads the given GLB with authored materials unchanged.
 * The mesh is not stretched to match UI dimensions — the file’s proportions are preserved.
 * Optional front decals (monogram / image) and dimension callouts use the customization state.
 */
export function BagTexturedGltfModel({
	glbUrl,
	customization,
	onFabricMeshReady,
	showDimensions = false,
	formatDimensionLabel,
}: BagTexturedGltfModelProps) {
	const { scene } = useGLTF(glbUrl);
	const cloned = useMemo(() => scene.clone(true), [scene]);
	const fabricMesh = useMemo(() => findFrontFabricMesh(cloned), [cloned]);
	const fabricMeshRef = useRef<THREE.Mesh | null>(null);
	fabricMeshRef.current = fabricMesh;

	const groupRef = useRef<THREE.Group>(null);
	const [decalPlacement, setDecalPlacement] =
		useState<DecalPlacementState | null>(null);

	const [frontImageEl, setFrontImageEl] = useState<HTMLImageElement | null>(
		null,
	);

	useLayoutEffect(() => {
		const run = () => {
			const g = groupRef.current;
			if (!g) {
				return;
			}
			cloned.updateMatrixWorld(true);
			g.updateMatrixWorld(true);
			const front = findFrontFabricMesh(cloned);
			if (front) {
				const p = computeFabricDecalPlacement(front);
				setDecalPlacement({
					mode: "surface",
					position: p.position,
					rotation: p.rotation,
					scale: p.scale,
				});
			} else {
				const p = fallbackProceduralDecal(customization);
				setDecalPlacement({
					mode: "plane",
					position: p.position,
					quaternion: p.quaternion,
					planeW: p.planeW,
					planeH: p.planeH,
				});
			}
		};
		run();
		const id = requestAnimationFrame(run);
		return () => cancelAnimationFrame(id);
	}, [cloned, customization]);

	useEffect(() => {
		onFabricMeshReady?.(fabricMesh);
		return () => {
			onFabricMeshReady?.(null);
		};
	}, [fabricMesh, onFabricMeshReady]);

	useEffect(() => {
		const url = customization.frontImageDataUrl?.trim();
		if (!url) {
			setFrontImageEl(null);
			return;
		}
		let cancelled = false;
		const img = new Image();
		// data: URLs must not use crossOrigin — "anonymous" can prevent decode/drawImage in some browsers.
		if (!url.startsWith("data:")) {
			img.crossOrigin = "anonymous";
		}
		img.onload = () => {
			if (cancelled) {
				return;
			}
			void img
				.decode()
				.then(() => {
					if (!cancelled) {
						setFrontImageEl(img);
					}
				})
				.catch(() => {
					if (!cancelled) {
						setFrontImageEl(img);
					}
				});
		};
		img.onerror = () => {
			if (!cancelled) {
				setFrontImageEl(null);
			}
		};
		img.src = url;
		return () => {
			cancelled = true;
			img.onload = null;
			img.onerror = null;
		};
	}, [customization.frontImageDataUrl]);

	const photoDecalTexture = useMemo(
		() =>
			buildPhotoDecalTexture(
				frontImageEl,
				customization.frontPhotoCropZoom ?? 1,
				customization.frontPhotoCropPanU ?? 0,
				customization.frontPhotoCropPanV ?? 0,
			),
		[
			frontImageEl,
			customization.frontPhotoCropZoom,
			customization.frontPhotoCropPanU,
			customization.frontPhotoCropPanV,
		],
	);

	const initialsDecalTexture = useMemo(
		() => buildInitialsDecalTexture(customization),
		[customization],
	);

	const compositeFallbackTexture = useMemo(
		() => buildCompositeFallbackTexture(customization, frontImageEl),
		[customization, frontImageEl],
	);

	useEffect(() => {
		return () => {
			photoDecalTexture?.dispose();
			initialsDecalTexture?.dispose();
			compositeFallbackTexture?.dispose();
		};
	}, [photoDecalTexture, initialsDecalTexture, compositeFallbackTexture]);

	useEffect(() => {
		return () => {
			cloned.traverse((o) => {
				if (o instanceof THREE.Mesh) {
					o.geometry.dispose();
					const m = o.material;
					const mats = Array.isArray(m) ? m : [m];
					for (const mat of mats) {
						mat.dispose();
					}
				}
			});
		};
	}, [cloned]);

	const hasFrontPhoto = Boolean(customization.frontImageDataUrl?.trim());
	const hasPhotoDecal = Boolean(photoDecalTexture);
	const baseKey = `${frontImageDataUrlKey(customization.frontImageDataUrl)}|${customization.initials}|${customization.initialsFontSize}|${customization.initialsColor}|${customization.frontPhotoPanU}|${customization.frontPhotoPanV}|${customization.frontPhotoScale}|${customization.frontPhotoCropZoom}|${customization.frontPhotoCropPanU}|${customization.frontPhotoCropPanV}`;

	const showSurfaceDecals =
		decalPlacement?.mode === "surface" && fabricMesh && decalPlacement;
	const monoScale = showSurfaceDecals
		? initialsDecalScale(decalPlacement.scale, hasPhotoDecal)
		: ([0, 0, 0] as [number, number, number]);

	const photoDecalTransform = useMemo(() => {
		if (
			!fabricMesh ||
			decalPlacement?.mode !== "surface" ||
			!photoDecalTexture
		) {
			return null;
		}
		const base: FabricSurfaceDecalPlacement = {
			position: decalPlacement.position,
			rotation: decalPlacement.rotation,
			scale: decalPlacement.scale,
		};
		const s = customization.frontPhotoScale ?? 1;
		const withPan = computePhotoDecalPlacementWithPan(
			fabricMesh,
			base,
			customization.frontPhotoPanU ?? 0,
			customization.frontPhotoPanV ?? 0,
			s,
		);
		return {
			...withPan,
			scale: [
				withPan.scale[0] * s,
				withPan.scale[1] * s,
				Math.max(withPan.scale[2] * s, 0.02),
			] as [number, number, number],
		};
	}, [
		fabricMesh,
		decalPlacement,
		photoDecalTexture,
		customization.frontPhotoPanU,
		customization.frontPhotoPanV,
		customization.frontPhotoScale,
	]);

	const planePannedPosition = useMemo((): [number, number, number] | null => {
		if (decalPlacement?.mode !== "plane") {
			return null;
		}
		const pu = customization.frontPhotoPanU ?? 0;
		const pv = customization.frontPhotoPanV ?? 0;
		const ps = hasFrontPhoto ? (customization.frontPhotoScale ?? 1) : 1;
		const psEff = hasFrontPhoto ? effectivePhotoPanScale(ps) : 1;
		const pw = decalPlacement.planeW * ps;
		const ph = decalPlacement.planeH * ps;
		if (!hasFrontPhoto) {
			return decalPlacement.position;
		}
		/* `pw`/`ph` already include scale; extra `psEff` extends reach when photo is enlarged. */
		const planePanFactor = 0.92 * psEff;
		return [
			decalPlacement.position[0] + pu * pw * planePanFactor,
			decalPlacement.position[1] + pv * ph * planePanFactor,
			decalPlacement.position[2],
		];
	}, [
		decalPlacement,
		hasFrontPhoto,
		customization.frontPhotoPanU,
		customization.frontPhotoPanV,
		customization.frontPhotoScale,
	]);

	const planePhotoGeometry = useMemo(() => {
		if (decalPlacement?.mode !== "plane") {
			return null;
		}
		const ps = hasFrontPhoto ? (customization.frontPhotoScale ?? 1) : 1;
		return [decalPlacement.planeW * ps, decalPlacement.planeH * ps] as [
			number,
			number,
		];
	}, [decalPlacement, customization.frontPhotoScale, hasFrontPhoto]);

	return (
		<>
			<group ref={groupRef} position={[0, -0.12, 0]}>
				<primitive object={cloned} />
				{showSurfaceDecals && photoDecalTexture && photoDecalTransform ? (
					<Decal
						key={`${baseKey}-photo`}
						debug={false}
						depthTest
						map={photoDecalTexture}
						mesh={fabricMeshRef as RefObject<THREE.Mesh>}
						polygonOffsetFactor={-12}
						position={photoDecalTransform.position}
						rotation={photoDecalTransform.rotation}
						renderOrder={2}
						scale={photoDecalTransform.scale}
					>
						<meshStandardMaterial
							depthWrite={false}
							map={photoDecalTexture}
							metalness={0.08}
							polygonOffset
							polygonOffsetFactor={-4}
							roughness={0.82}
							transparent
						/>
					</Decal>
				) : null}
				{showSurfaceDecals && initialsDecalTexture ? (
					<Decal
						key={`${baseKey}-initials`}
						debug={false}
						depthTest
						map={initialsDecalTexture}
						mesh={fabricMeshRef as RefObject<THREE.Mesh>}
						polygonOffsetFactor={-14}
						position={decalPlacement.position}
						rotation={decalPlacement.rotation}
						renderOrder={3}
						scale={monoScale}
					>
						<meshStandardMaterial
							alphaTest={0.04}
							depthWrite={false}
							map={initialsDecalTexture}
							metalness={0.08}
							polygonOffset
							polygonOffsetFactor={hasFrontPhoto ? -6 : -3}
							roughness={0.82}
							transparent
						/>
					</Decal>
				) : null}
				{compositeFallbackTexture &&
				decalPlacement?.mode === "plane" &&
				planePannedPosition &&
				planePhotoGeometry ? (
					<mesh
						key={`${baseKey}-plane`}
						position={planePannedPosition}
						quaternion={decalPlacement.quaternion}
						renderOrder={2}
					>
						<planeGeometry args={planePhotoGeometry} />
						<meshStandardMaterial
							depthWrite={false}
							map={compositeFallbackTexture}
							metalness={0.08}
							polygonOffset
							polygonOffsetFactor={hasFrontPhoto ? -3 : -2}
							roughness={0.82}
							transparent
						/>
					</mesh>
				) : null}
			</group>
			{showDimensions && formatDimensionLabel ? (
				<BagDimensionGuides
					rootRef={groupRef}
					widthCm={customization.width}
					heightCm={customization.height}
					depthCm={customization.depth}
					visible={showDimensions}
					formatLabel={formatDimensionLabel}
				/>
			) : null}
		</>
	);
}
