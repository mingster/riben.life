"use client";

import {
	ContactShadows,
	Environment,
	OrbitControls,
	PerspectiveCamera,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
	type RefObject,
	Suspense,
	useCallback,
	useId,
	useRef,
	useState,
} from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useTranslation } from "@/app/i18n/client";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_CUSTOMIZER_GLB_PATH } from "@/lib/shop/product-customizer-glb";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import type { BagCustomization } from "@/types/customizer";
import { BagTexturedGltfModel } from "./bag-textured-gltf-model";

interface Bag3DCanvasProps {
	/** GLB under `public/models/`; defaults to legacy demo asset for `/shop/p/ac73b282-837f-4451-933e-0b59961d6b76/customizer` without a product. */
	glbUrl?: string;
	customization: BagCustomization;
	/** When set, pan updates while {@link photoRepositionMode} shows sliders below the move button. */
	onCustomizationChange?: (patch: Partial<BagCustomization>) => void;
	/**
	 * When true, photo position sliders appear below the toolbar on the preview. Orbit/zoom unchanged.
	 */
	photoRepositionMode?: boolean;
	/** Toggle reposition mode; shown next to dimensions when {@link onCustomizationChange} is set and a front photo exists. */
	onPhotoRepositionModeChange?: (active: boolean) => void;
}

/** Orbit target — slightly below origin so the bag sits comfortably in frame. */
const CAMERA_TARGET: [number, number, number] = [0, -0.1, 0];
/**
 * Default three-quarter view, ~65% of the former camera–target distance so the bag
 * fills more of the canvas (closer to product-shot framing); orbit zoom still available.
 */
const CAMERA_POSITION: [number, number, number] = [2.95, 1.52, 4.35];

/** Same size/weight as {@link ViewerHint}; toolbar uses muted/active colors. */
const VIEWER_CAPTION_TEXT =
	"text-[0.65rem] uppercase leading-snug tracking-[0.18em]";
const VIEWER_CAPTION_MUTED = "text-neutral-400";
const VIEWER_CAPTION_ACTIVE =
	"font-medium text-neutral-900 underline underline-offset-4 dark:text-white";

function ViewerHint({
	photoRepositionMode,
	hasFrontPhoto,
}: {
	photoRepositionMode: boolean;
	hasFrontPhoto: boolean;
}) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "customized");
	const message =
		photoRepositionMode && hasFrontPhoto
			? t("viewer_hint_photo_reposition_mode")
			: t("viewer_hint_rotate_zoom");
	return (
		<p
			className={cn(
				"pointer-events-none absolute bottom-3 left-1/2 z-10 max-w-[min(100%,28rem)] -translate-x-1/2 px-2 text-center",
				VIEWER_CAPTION_TEXT,
				VIEWER_CAPTION_MUTED,
			)}
		>
			{message}
		</p>
	);
}

interface Bag3DCanvasSceneProps {
	glbUrl: string;
	customization: BagCustomization;
	orbitControlsRef: RefObject<OrbitControlsImpl | null>;
	showDimensions: boolean;
	formatDimensionLabel: (value: number) => string;
}

function Bag3DCanvasScene({
	glbUrl,
	customization,
	orbitControlsRef,
	showDimensions,
	formatDimensionLabel,
}: Bag3DCanvasSceneProps) {
	return (
		<>
			<color attach="background" args={["#f6f6f6"]} />
			<PerspectiveCamera
				makeDefault
				position={CAMERA_POSITION}
				fov={36}
				near={0.1}
				far={200}
			/>

			<ambientLight intensity={1.15} />
			<directionalLight
				position={[14, 32, 20]}
				intensity={1.65}
				color="#ffffff"
			/>
			<directionalLight
				position={[-18, 18, -10]}
				intensity={0.72}
				color="#eef2ff"
			/>
			<directionalLight
				position={[2, 10, 24]}
				intensity={1.25}
				color="#fffefb"
			/>
			<hemisphereLight args={["#ffffff", "#e8e4df", 0.62]} />
			<pointLight position={[0, 8, 12]} intensity={0.45} color="#ffffff" />

			<Suspense fallback={null}>
				<Environment preset="city" environmentIntensity={0.55} />
				<BagTexturedGltfModel
					key={glbUrl}
					glbUrl={glbUrl}
					customization={customization}
					showDimensions={showDimensions}
					formatDimensionLabel={formatDimensionLabel}
				/>
				<ContactShadows
					position={[0, -1.55, 0]}
					opacity={0.28}
					scale={14}
					blur={2.2}
					far={5}
				/>
			</Suspense>

			<OrbitControls
				ref={orbitControlsRef}
				enableZoom
				enablePan={false}
				autoRotate={false}
				autoRotateSpeed={1.2}
				minPolarAngle={0.2}
				maxPolarAngle={Math.PI - 0.15}
				target={CAMERA_TARGET}
			/>
		</>
	);
}

export function Bag3DCanvas({
	glbUrl = DEFAULT_CUSTOMIZER_GLB_PATH,
	customization,
	onCustomizationChange,
	photoRepositionMode = false,
	onPhotoRepositionModeChange,
}: Bag3DCanvasProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "customized");
	const [showDimensions, setShowDimensions] = useState(false);
	const [dimensionUnit, setDimensionUnit] = useState<"cm" | "in">("cm");
	const orbitControlsRef = useRef<OrbitControlsImpl | null>(null);

	const formatDimensionLabel = useCallback(
		(valueCm: number) => {
			if (dimensionUnit === "in") {
				const inches = valueCm / 2.54;
				return String(t("dimensions_value_in", { value: inches.toFixed(1) }));
			}
			return String(t("dimensions_value_cm", { value: valueCm }));
		},
		[dimensionUnit, t],
	);

	const hasFrontPhoto = Boolean(customization.frontImageDataUrl?.trim());
	const showPhotoMoveToolbar =
		Boolean(onCustomizationChange) &&
		Boolean(onPhotoRepositionModeChange) &&
		hasFrontPhoto;
	const panSliderIdU = useId();
	const panSliderIdV = useId();

	const applyPanPatch = useCallback(
		(patch: Partial<BagCustomization>) => {
			onCustomizationChange?.(patch);
		},
		[onCustomizationChange],
	);

	return (
		<div
			className={cn(
				"relative h-full min-h-0 w-full bg-[#f6f6f6]",
				photoRepositionMode &&
					hasFrontPhoto &&
					"ring-2 ring-inset ring-primary/50",
			)}
		>
			<Canvas
				className="h-full w-full touch-none"
				dpr={[1, 2]}
				resize={{
					scroll: false,
					debounce: { scroll: 0, resize: 0 },
					offsetSize: true,
				}}
				gl={{
					antialias: true,
					alpha: true,
					powerPreference: "high-performance",
					toneMapping: THREE.ACESFilmicToneMapping,
					toneMappingExposure: 1.22,
				}}
			>
				<Bag3DCanvasScene
					glbUrl={glbUrl}
					customization={customization}
					orbitControlsRef={orbitControlsRef}
					showDimensions={showDimensions}
					formatDimensionLabel={formatDimensionLabel}
				/>
			</Canvas>
			<div
				className={cn(
					"absolute top-3 right-3 z-20 flex w-auto max-w-[min(100%,20rem)] flex-col items-end gap-2 pl-2 sm:pl-3",
				)}
			>
				<div className="w-full rounded-xl border border-white/60 bg-white/45 px-2.5 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/15 dark:bg-white/10 dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
					<div className="flex flex-wrap items-center justify-end gap-3 sm:gap-2">
						<button
							type="button"
							className={cn(
								"touch-manipulation border-0 bg-transparent px-2 py-2.5 text-center shadow-none transition-colors",
								"min-h-11 sm:min-h-0 sm:py-1.5",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
								VIEWER_CAPTION_TEXT,
								showDimensions
									? VIEWER_CAPTION_ACTIVE
									: cn(
											VIEWER_CAPTION_MUTED,
											"hover:text-neutral-600 dark:hover:text-neutral-300",
										),
							)}
							onClick={() => setShowDimensions((open) => !open)}
						>
							{showDimensions
								? t("viewer_dimensions_hide")
								: t("viewer_dimensions_show")}
						</button>
						{showPhotoMoveToolbar ? (
							<button
								type="button"
								className={cn(
									"touch-manipulation border-0 bg-transparent px-2 py-2.5 text-center shadow-none transition-colors",
									"min-h-11 sm:min-h-0 sm:py-1.5",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									VIEWER_CAPTION_TEXT,
									photoRepositionMode
										? VIEWER_CAPTION_ACTIVE
										: cn(
												VIEWER_CAPTION_MUTED,
												"hover:text-neutral-600 dark:hover:text-neutral-300",
											),
								)}
								onClick={() =>
									onPhotoRepositionModeChange?.(!photoRepositionMode)
								}
							>
								{photoRepositionMode
									? t("front_photo_reposition_done_button")
									: t("front_photo_reposition_start_button")}
							</button>
						) : null}
					</div>
					{showDimensions ? (
						<fieldset className="mt-2 flex items-center justify-end gap-4 border-0 border-t border-white/35 pt-2 text-xs text-neutral-600 dark:border-white/15 dark:text-neutral-300">
							<legend className="sr-only">
								{t("dimensions_unit_group_label")}
							</legend>
							<button
								type="button"
								className={cn(
									"touch-manipulation underline-offset-4 transition-colors hover:text-neutral-900 dark:hover:text-neutral-50",
									dimensionUnit === "in"
										? "font-medium text-neutral-900 underline dark:text-white"
										: "text-neutral-500 dark:text-neutral-400",
								)}
								onClick={() => setDimensionUnit("in")}
							>
								{t("dimensions_unit_in")}
							</button>
							<button
								type="button"
								className={cn(
									"touch-manipulation underline-offset-4 transition-colors hover:text-neutral-900 dark:hover:text-neutral-50",
									dimensionUnit === "cm"
										? "font-medium text-neutral-900 underline dark:text-white"
										: "text-neutral-500 dark:text-neutral-400",
								)}
								onClick={() => setDimensionUnit("cm")}
							>
								{t("dimensions_unit_cm")}
							</button>
						</fieldset>
					) : null}
				</div>
				{photoRepositionMode && hasFrontPhoto && onCustomizationChange ? (
					<div className="w-full rounded-xl border border-white/60 bg-white/45 p-3 shadow-[0_4px_24px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/15 dark:bg-white/10 dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
						<p className="mb-3 text-center text-xs font-medium text-foreground">
							{t("front_photo_pan_sliders_title")}
						</p>
						<div className="space-y-3">
							<div>
								<Label
									htmlFor={panSliderIdU}
									className="text-xs font-medium sm:text-sm"
								>
									{t("front_photo_pan_u_label", {
										pct: Math.round((customization.frontPhotoPanU ?? 0) * 100),
									})}
								</Label>
								<Slider
									id={panSliderIdU}
									min={-120}
									max={120}
									step={5}
									value={[
										Math.round((customization.frontPhotoPanU ?? 0) * 100),
									]}
									onValueChange={(value) =>
										applyPanPatch({
											frontPhotoPanU: Math.min(
												1.2,
												Math.max(-1.2, value[0] / 100),
											),
										})
									}
									className="mt-2 touch-manipulation"
								/>
							</div>
							<div>
								<Label
									htmlFor={panSliderIdV}
									className="text-xs font-medium sm:text-sm"
								>
									{t("front_photo_pan_v_label", {
										pct: Math.round((customization.frontPhotoPanV ?? 0) * 100),
									})}
								</Label>
								<Slider
									id={panSliderIdV}
									min={-120}
									max={120}
									step={5}
									value={[
										Math.round((customization.frontPhotoPanV ?? 0) * 100),
									]}
									onValueChange={(value) =>
										applyPanPatch({
											frontPhotoPanV: Math.min(
												1.2,
												Math.max(-1.2, value[0] / 100),
											),
										})
									}
									className="mt-2 touch-manipulation"
								/>
							</div>
						</div>
						<p className="mt-3 text-center text-[0.65rem] font-mono text-muted-foreground">
							{t("front_photo_pan_sliders_descr")}
						</p>
					</div>
				) : null}
			</div>
			<ViewerHint
				photoRepositionMode={photoRepositionMode}
				hasFrontPhoto={hasFrontPhoto}
			/>
		</div>
	);
}
