"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Crop rectangle in normalized image coordinates (0–1). */
export type NormalizedCrop = { x: number; y: number; w: number; h: number };

const MIN_FRAC = 0.08;

function clampCrop(c: NormalizedCrop): NormalizedCrop {
	let { x, y, w, h } = c;
	w = Math.max(MIN_FRAC, Math.min(1, w));
	h = Math.max(MIN_FRAC, Math.min(1, h));
	x = Math.max(0, Math.min(1 - w, x));
	y = Math.max(0, Math.min(1 - h, y));
	return { x, y, w, h };
}

function cropToDataUrl(
	img: HTMLImageElement,
	crop: NormalizedCrop,
	mime: "image/jpeg" | "image/png",
): string {
	const iw = img.naturalWidth;
	const ih = img.naturalHeight;
	if (iw <= 0 || ih <= 0) {
		return "";
	}
	const sx = Math.round(crop.x * iw);
	const sy = Math.round(crop.y * ih);
	const sw = Math.round(crop.w * iw);
	const sh = Math.round(crop.h * ih);
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, sw);
	canvas.height = Math.max(1, sh);
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return "";
	}
	if (mime === "image/jpeg") {
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}
	ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
	const q = mime === "image/jpeg" ? 0.92 : undefined;
	return canvas.toDataURL(mime, q);
}

function mimeFromDataUrl(src: string): "image/jpeg" | "image/png" {
	return src.startsWith("data:image/png") ? "image/png" : "image/jpeg";
}

type DragMode = "move" | "nw" | "ne" | "sw" | "se" | null;

interface FrontPhotoCropDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	imageSrc: string;
	onConfirm: (croppedDataUrl: string) => void;
	title: string;
	description: string;
	confirmLabel: string;
	cancelLabel: string;
}

/**
 * Modal to drag a crop rectangle on the photo; confirm writes a new data URL, cancel discards.
 */
export function FrontPhotoCropDialog({
	open,
	onOpenChange,
	imageSrc,
	onConfirm,
	title,
	description,
	confirmLabel,
	cancelLabel,
}: FrontPhotoCropDialogProps) {
	const [crop, setCrop] = useState<NormalizedCrop>({
		x: 0,
		y: 0,
		w: 1,
		h: 1,
	});
	const [imgReady, setImgReady] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const imgRef = useRef<HTMLImageElement | null>(null);
	const frameRef = useRef<HTMLDivElement | null>(null);
	const dragRef = useRef<{
		mode: DragMode;
		startX: number;
		startY: number;
		startCrop: NormalizedCrop;
		/** Opposite corner fixed during resize (normalized). */
		anchor?: { x: number; y: number };
		pointerId: number;
		captureEl: HTMLElement;
	} | null>(null);

	const endDrag = useCallback(() => {
		const d = dragRef.current;
		if (d?.captureEl) {
			try {
				if (d.captureEl.hasPointerCapture(d.pointerId)) {
					d.captureEl.releasePointerCapture(d.pointerId);
				}
			} catch {
				/* ignore */
			}
		}
		dragRef.current = null;
	}, []);

	const resetDraft = useCallback(() => {
		endDrag();
		setCrop({ x: 0, y: 0, w: 1, h: 1 });
		setImgReady(false);
	}, [endDrag]);

	useEffect(() => {
		if (open) {
			resetDraft();
		}
	}, [open, resetDraft]);

	const clientToNorm = useCallback(
		(clientX: number, clientY: number): { nx: number; ny: number } | null => {
			const el = frameRef.current;
			if (!el) {
				return null;
			}
			const r = el.getBoundingClientRect();
			if (r.width <= 0 || r.height <= 0) {
				return null;
			}
			return {
				nx: (clientX - r.left) / r.width,
				ny: (clientY - r.top) / r.height,
			};
		},
		[],
	);

	useEffect(() => {
		if (!open) {
			return;
		}
		const onMove = (e: PointerEvent) => {
			const d = dragRef.current;
			if (!d?.mode || e.pointerId !== d.pointerId) {
				return;
			}
			e.preventDefault();
			const p = clientToNorm(e.clientX, e.clientY);
			if (!p) {
				return;
			}
			const { startX, startY, startCrop, mode, anchor } = d;

			setCrop(() => {
				if (mode === "move") {
					const dx = p.nx - startX;
					const dy = p.ny - startY;
					return clampCrop({
						x: startCrop.x + dx,
						y: startCrop.y + dy,
						w: startCrop.w,
						h: startCrop.h,
					});
				}
				if (!anchor) {
					return startCrop;
				}
				if (mode === "se") {
					return clampCrop({
						x: anchor.x,
						y: anchor.y,
						w: p.nx - anchor.x,
						h: p.ny - anchor.y,
					});
				}
				if (mode === "sw") {
					return clampCrop({
						x: p.nx,
						y: anchor.y,
						w: anchor.x - p.nx,
						h: p.ny - anchor.y,
					});
				}
				if (mode === "ne") {
					return clampCrop({
						x: anchor.x,
						y: p.ny,
						w: p.nx - anchor.x,
						h: anchor.y - p.ny,
					});
				}
				if (mode === "nw") {
					return clampCrop({
						x: p.nx,
						y: p.ny,
						w: anchor.x - p.nx,
						h: anchor.y - p.ny,
					});
				}
				return startCrop;
			});
		};
		const onUp = (e: PointerEvent) => {
			const d = dragRef.current;
			if (!d?.mode || e.pointerId !== d.pointerId) {
				return;
			}
			endDrag();
		};
		/* document + capture: iOS Safari delivers move/up reliably during drag; window can miss events after setPointerCapture */
		document.addEventListener("pointermove", onMove, { passive: false });
		document.addEventListener("pointerup", onUp);
		document.addEventListener("pointercancel", onUp);
		return () => {
			document.removeEventListener("pointermove", onMove);
			document.removeEventListener("pointerup", onUp);
			document.removeEventListener("pointercancel", onUp);
		};
	}, [open, clientToNorm, endDrag]);

	const startDrag = (
		mode: DragMode,
		e: React.PointerEvent,
		startCropSnapshot: NormalizedCrop,
	) => {
		e.preventDefault();
		e.stopPropagation();
		const target = e.currentTarget;
		if (!(target instanceof HTMLElement)) {
			return;
		}
		try {
			target.setPointerCapture(e.pointerId);
		} catch {
			/* Safari may throw if capture unsupported */
		}
		const p = clientToNorm(e.clientX, e.clientY);
		if (!p) {
			return;
		}
		const sc = { ...startCropSnapshot };
		let anchor: { x: number; y: number } | undefined;
		if (mode === "se") {
			anchor = { x: sc.x, y: sc.y };
		} else if (mode === "sw") {
			anchor = { x: sc.x + sc.w, y: sc.y };
		} else if (mode === "ne") {
			anchor = { x: sc.x, y: sc.y + sc.h };
		} else if (mode === "nw") {
			anchor = { x: sc.x + sc.w, y: sc.y + sc.h };
		}
		dragRef.current = {
			mode,
			startX: p.nx,
			startY: p.ny,
			startCrop: sc,
			anchor,
			pointerId: e.pointerId,
			captureEl: target,
		};
	};

	const handleCancel = () => {
		resetDraft();
		onOpenChange(false);
	};

	const handleConfirm = async () => {
		const img = imgRef.current;
		if (!img || !imgReady || img.naturalWidth <= 0) {
			return;
		}
		setSubmitting(true);
		try {
			const mime = mimeFromDataUrl(imageSrc);
			const url = cropToDataUrl(img, crop, mime);
			if (url) {
				onConfirm(url);
				onOpenChange(false);
				resetDraft();
			}
		} finally {
			setSubmitting(false);
		}
	};

	const handleOpenChange = (next: boolean) => {
		if (!next) {
			resetDraft();
		}
		onOpenChange(next);
	};

	// 44px min on touch (iOS); smaller on desktop
	const cornerBtn =
		"absolute z-10 h-11 w-11 min-h-[44px] min-w-[44px] -translate-x-1/2 -translate-y-1/2 touch-manipulation rounded-sm border-2 border-white bg-primary shadow-md sm:h-3.5 sm:w-3.5 sm:min-h-0 sm:min-w-0";

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				className="max-h-[min(92vh,calc(100vh-2rem))] max-w-[calc(100%-1rem)] gap-4 overflow-y-auto p-4 sm:max-w-xl sm:p-6"
				showCloseButton
				onPointerDownOutside={(e) => {
					if (dragRef.current?.mode) {
						e.preventDefault();
					}
				}}
			>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				<div className="flex justify-center">
					<div
						ref={frameRef}
						className="relative inline-block max-h-[min(52vh,420px)] max-w-full touch-none select-none"
					>
						{/* eslint-disable-next-line @next/next/no-img-element -- data URL preview */}
						<img
							ref={imgRef}
							key={imageSrc}
							src={imageSrc}
							alt=""
							draggable={false}
							className="block max-h-[min(52vh,420px)] max-w-full h-auto w-auto touch-none object-contain select-none"
							style={{ WebkitTouchCallout: "none" }}
							onLoad={() => setImgReady(true)}
						/>
						{imgReady ? (
							<div className="pointer-events-none absolute inset-0 touch-none">
								<div
									className="pointer-events-auto absolute cursor-move touch-none border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] touch-manipulation"
									style={{
										left: `${crop.x * 100}%`,
										top: `${crop.y * 100}%`,
										width: `${crop.w * 100}%`,
										height: `${crop.h * 100}%`,
										touchAction: "none",
									}}
									onPointerDown={(e) => startDrag("move", e, crop)}
									role="presentation"
								>
									<button
										type="button"
										aria-label="nw"
										className={cn(cornerBtn, "left-0 top-0 cursor-nwse-resize")}
										onPointerDown={(e) => startDrag("nw", e, crop)}
									/>
									<button
										type="button"
										aria-label="ne"
										className={cn(
											cornerBtn,
											"left-full top-0 cursor-nesw-resize",
										)}
										onPointerDown={(e) => startDrag("ne", e, crop)}
									/>
									<button
										type="button"
										aria-label="sw"
										className={cn(
											cornerBtn,
											"left-0 top-full cursor-nesw-resize",
										)}
										onPointerDown={(e) => startDrag("sw", e, crop)}
									/>
									<button
										type="button"
										aria-label="se"
										className={cn(
											cornerBtn,
											"left-full top-full cursor-nwse-resize",
										)}
										onPointerDown={(e) => startDrag("se", e, crop)}
									/>
								</div>
							</div>
						) : null}
					</div>
				</div>

				<DialogFooter className="gap-2 sm:gap-2">
					<Button
						type="button"
						variant="outline"
						className="h-10 touch-manipulation sm:h-9 sm:min-h-0"
						disabled={submitting}
						onClick={handleCancel}
					>
						{cancelLabel}
					</Button>
					<Button
						type="button"
						className="h-10 touch-manipulation sm:h-9 sm:min-h-0"
						disabled={!imgReady || submitting}
						onClick={() => void handleConfirm()}
					>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
