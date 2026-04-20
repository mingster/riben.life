"use client";

import { Html, Line } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { type RefObject, useEffect, useRef, useState } from "react";
import * as THREE from "three";

export interface BagDimensionLayout {
	/** Two segments per axis: gap at midpoint so the line does not run through the label. */
	heightLines: [[THREE.Vector3, THREE.Vector3], [THREE.Vector3, THREE.Vector3]];
	widthLines: [[THREE.Vector3, THREE.Vector3], [THREE.Vector3, THREE.Vector3]];
	depthLines: [[THREE.Vector3, THREE.Vector3], [THREE.Vector3, THREE.Vector3]];
	ticks: [THREE.Vector3, THREE.Vector3][];
	/** Midpoints of full dimension segments (labels centered here). */
	labelHeight: THREE.Vector3;
	labelWidth: THREE.Vector3;
	labelDepth: THREE.Vector3;
}

const _edgeA = new THREE.Vector3();
const _edgeB = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();

/**
 * Split segment [a,b] with a symmetric gap around the midpoint (technical drawing style).
 */
function splitSegmentWithGap(
	a: THREE.Vector3,
	b: THREE.Vector3,
	gapHalfWorld: number,
): [[THREE.Vector3, THREE.Vector3], [THREE.Vector3, THREE.Vector3]] {
	_edgeA.copy(a);
	_edgeB.copy(b);
	_dir.subVectors(_edgeB, _edgeA);
	const len = _dir.length();
	if (len < 1e-6) {
		const z = new THREE.Vector3();
		return [
			[z.clone(), z.clone()],
			[z.clone(), z.clone()],
		];
	}
	_dir.multiplyScalar(1 / len);
	const halfGap = Math.min(gapHalfWorld, len * 0.22);
	_mid.copy(_edgeA).addScaledVector(_dir, len * 0.5);
	const p1 = _mid.clone().addScaledVector(_dir, -halfGap);
	const p2 = _mid.clone().addScaledVector(_dir, halfGap);
	return [
		[_edgeA.clone(), p1],
		[p2, _edgeB.clone()],
	];
}

/**
 * Technical dimensions: height vertical on the left (front plane), width below, depth on the right base (L).
 * When `referenceCm` is set, segment lengths use the same world scale `k` so line proportions match
 * product width × height × depth (cm); otherwise lengths follow the mesh bounding box only.
 */
function buildLayout(
	box: THREE.Box3,
	padScale: number,
	cameraPosition: THREE.Vector3,
	referenceCm?: { widthCm: number; heightCm: number; depthCm: number },
): BagDimensionLayout {
	const min = box.min;
	const max = box.max;
	const cx = (min.x + max.x) / 2;
	const cy = (min.y + max.y) / 2;
	const dx = max.x - min.x;
	const dy = max.y - min.y;
	const dz = max.z - min.z;
	const pad = Math.max(dx, dy, dz, 0.05) * padScale;
	const tick = pad * 0.32;
	const gapHalf = pad * 0.26;

	const midY = (min.y + max.y) / 2;
	const pMinZ = _tmpV1.set(cx, midY, min.z);
	const pMaxZ = _tmpV2.set(cx, midY, max.z);
	const dMinZ = cameraPosition.distanceToSquared(pMinZ);
	const dMaxZ = cameraPosition.distanceToSquared(pMaxZ);
	const zFront = dMinZ < dMaxZ ? min.z : max.z;
	const zBack = dMinZ < dMaxZ ? max.z : min.z;
	const zW =
		zFront +
		Math.sign(zFront - zBack) *
			Math.min(pad * 0.14, Math.abs(zFront - zBack) * 0.08);

	const yW = min.y - pad;
	const xH = min.x - pad;
	const xR = max.x + pad * 0.03;

	const {
		w: widthLen,
		h: heightLen,
		d: depthLen,
	} = (() => {
		const ref = referenceCm;
		if (
			!ref ||
			!(ref.widthCm > 0) ||
			!(ref.heightCm > 0) ||
			!(ref.depthCm > 0) ||
			!(dx > 1e-8) ||
			!(dy > 1e-8) ||
			!(dz > 1e-8)
		) {
			return { w: dx, h: dy, d: dz };
		}
		const k = (dx / ref.widthCm + dy / ref.heightCm + dz / ref.depthCm) / 3;
		return {
			w: ref.widthCm * k,
			h: ref.heightCm * k,
			d: ref.depthCm * k,
		};
	})();

	const yH0 = cy - heightLen / 2;
	const yH1 = cy + heightLen / 2;
	const h0 = new THREE.Vector3(xH, yH0, zW);
	const h1 = new THREE.Vector3(xH, yH1, zW);

	const xW0 = cx - widthLen / 2;
	const xW1 = cx + widthLen / 2;
	const w0 = new THREE.Vector3(xW0, yW, zW);
	const w1 = new THREE.Vector3(xW1, yW, zW);

	const zMid = (zW + zBack) / 2;
	const zSign = zBack >= zW ? 1 : -1;
	const d0 = new THREE.Vector3(xR, yW, zMid - (zSign * depthLen) / 2);
	const d1 = new THREE.Vector3(xR, yW, zMid + (zSign * depthLen) / 2);

	const zMidDepth = (d0.z + d1.z) / 2;

	const ticks: [THREE.Vector3, THREE.Vector3][] = [
		[
			new THREE.Vector3(xH - tick, yH0, zW),
			new THREE.Vector3(xH + tick, yH0, zW),
		],
		[
			new THREE.Vector3(xH - tick, yH1, zW),
			new THREE.Vector3(xH + tick, yH1, zW),
		],
		[
			new THREE.Vector3(xW0, yW - tick, zW),
			new THREE.Vector3(xW0, yW + tick, zW),
		],
		[
			new THREE.Vector3(xW1, yW - tick, zW),
			new THREE.Vector3(xW1, yW + tick, zW),
		],
		[
			new THREE.Vector3(xR - tick, yW, d0.z),
			new THREE.Vector3(xR + tick, yW, d0.z),
		],
		[
			new THREE.Vector3(xR - tick, yW, d1.z),
			new THREE.Vector3(xR + tick, yW, d1.z),
		],
	];

	const heightLines = splitSegmentWithGap(h0, h1, gapHalf);
	const widthLines = splitSegmentWithGap(w0, w1, gapHalf);
	const depthLines = splitSegmentWithGap(d0, d1, gapHalf);

	return {
		heightLines,
		widthLines,
		depthLines,
		ticks,
		labelHeight: new THREE.Vector3(xH, cy, zW),
		labelWidth: new THREE.Vector3(cx, yW, zW),
		labelDepth: new THREE.Vector3(xR, yW, zMidDepth),
	};
}

const _tmpV1 = new THREE.Vector3();
const _tmpV2 = new THREE.Vector3();

function layoutSignature(L: BagDimensionLayout): string {
	const f = (v: THREE.Vector3) =>
		`${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
	const segs = [...L.heightLines, ...L.widthLines, ...L.depthLines] as [
		THREE.Vector3,
		THREE.Vector3,
	][];
	return segs.flatMap((seg) => [f(seg[0]), f(seg[1])]).join("|");
}

function segmentKey(seg: [THREE.Vector3, THREE.Vector3]): string {
	const f = (v: THREE.Vector3) =>
		`${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
	return `${f(seg[0])}|${f(seg[1])}`;
}

interface BagDimensionGuidesProps {
	rootRef: RefObject<THREE.Group | null>;
	widthCm: number;
	heightCm: number;
	depthCm: number;
	visible: boolean;
	formatLabel: (value: number) => string;
}

/** Match `ViewerHint` in `bag-3d-canvas.tsx` (color + type scale). */
const labelPillClass =
	"pointer-events-none whitespace-nowrap px-2 text-center font-sans text-[0.45rem] uppercase leading-snug tracking-[0.18em] text-neutral-400 tabular-nums";

/**
 * Dimension lines with a gap at label midpoints (no line through text); labels at segment centers.
 */
export function BagDimensionGuides({
	rootRef,
	widthCm,
	heightCm,
	depthCm,
	visible,
	formatLabel,
}: BagDimensionGuidesProps) {
	const layoutRef = useRef<BagDimensionLayout | null>(null);
	const sigRef = useRef("");
	const [, setVersion] = useState(0);
	const { camera } = useThree();

	useEffect(() => {
		if (!visible) {
			layoutRef.current = null;
			sigRef.current = "";
		}
	}, [visible]);

	useFrame(() => {
		if (!visible) {
			return;
		}
		const g = rootRef.current;
		if (!g) {
			return;
		}
		g.updateMatrixWorld(true);
		const box = new THREE.Box3().setFromObject(g);
		if (box.isEmpty()) {
			return;
		}
		const refCm =
			widthCm > 0 && heightCm > 0 && depthCm > 0
				? { widthCm, heightCm, depthCm }
				: undefined;
		const L = buildLayout(box, 0.1, camera.position, refCm);
		const sig = `${layoutSignature(L)}|${widthCm}|${heightCm}|${depthCm}`;
		if (sig !== sigRef.current) {
			sigRef.current = sig;
			layoutRef.current = L;
			setVersion((v) => v + 1);
		}
	});

	if (!visible) {
		return null;
	}

	const L = layoutRef.current;
	if (!L) {
		return null;
	}

	const lineProps = {
		lineWidth: 1,
		color: "#b4b4b4" as const,
		depthTest: false,
		renderOrder: 1000,
		transparent: true,
		opacity: 0.92,
	};

	const dimensionSegments: [THREE.Vector3, THREE.Vector3][] = [
		L.heightLines[0],
		L.heightLines[1],
		L.widthLines[0],
		L.widthLines[1],
		L.depthLines[0],
		L.depthLines[1],
	];

	return (
		<group renderOrder={1000}>
			{dimensionSegments.map((points) => (
				<Line key={segmentKey(points)} points={points} {...lineProps} />
			))}
			{L.ticks.map((seg) => (
				<Line
					key={`${seg[0].x.toFixed(4)}-${seg[0].y.toFixed(4)}-${seg[0].z.toFixed(4)}-${seg[1].x.toFixed(4)}-${seg[1].y.toFixed(4)}-${seg[1].z.toFixed(4)}`}
					points={seg}
					{...lineProps}
				/>
			))}
			<Html
				position={L.labelHeight}
				center
				distanceFactor={5.5}
				zIndexRange={[100, 0]}
			>
				<span className={labelPillClass}>{formatLabel(heightCm)}</span>
			</Html>
			<Html
				position={L.labelWidth}
				center
				distanceFactor={5.5}
				zIndexRange={[100, 0]}
			>
				<span className={labelPillClass}>{formatLabel(widthCm)}</span>
			</Html>
			<Html
				position={L.labelDepth}
				center
				distanceFactor={5.5}
				zIndexRange={[100, 0]}
			>
				<span className={labelPillClass}>{formatLabel(depthCm)}</span>
			</Html>
		</group>
	);
}
