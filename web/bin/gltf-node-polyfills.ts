/**
 * Install globals so THREE.GLTFExporter runs under Bun/Node (no browser).
 * Import this module once at the top of export scripts (side effects only).
 */
import { Canvas, createCanvas, ImageData } from "canvas";

(
	globalThis as unknown as { HTMLCanvasElement: typeof Canvas }
).HTMLCanvasElement = Canvas;

/** `canvas` package typings omit browser `toBlob`; GLTFExporter expects it. */
type CanvasWithToBlob = Canvas & {
	toBlob(
		callback: (blob: Blob | null) => void,
		mimeType?: string,
		quality?: number,
	): void;
};

(
	Canvas.prototype as unknown as {
		toBlob: CanvasWithToBlob["toBlob"];
	}
).toBlob = function (
	this: Canvas,
	callback: (blob: Blob | null) => void,
	mimeType = "image/png",
): void {
	try {
		const buf =
			mimeType.includes("jpeg") || mimeType.includes("jpg")
				? this.toBuffer("image/jpeg", { quality: 0.92 })
				: this.toBuffer("image/png");
		callback(
			new Blob([new Uint8Array(buf)], {
				type: mimeType,
			}),
		);
	} catch {
		callback(null);
	}
};

if (typeof globalThis.ImageData === "undefined") {
	(globalThis as unknown as { ImageData: typeof ImageData }).ImageData =
		ImageData;
}

if (typeof globalThis.FileReader === "undefined") {
	type MinimalFileReader = Pick<
		FileReader,
		"result" | "onloadend" | "readAsArrayBuffer"
	>;
	const PolyfillFileReader = class implements MinimalFileReader {
		result: ArrayBuffer | null = null;
		onloadend: ((ev: unknown) => void) | null = null;

		/**
		 * THREE.GLTFExporter does `readAsArrayBuffer(blob)` and only then assigns `onloadend`.
		 * We must not run the callback until the buffer exists *and* that assignment has run.
		 * `await` inside an async IIFE yields after scheduling the read; the exporter’s
		 * synchronous `reader.onloadend = …` runs before the continuation, matching the browser.
		 */
		readAsArrayBuffer(blob: Blob): void {
			void (async () => {
				try {
					this.result = await blob.arrayBuffer();
				} catch {
					this.result = null;
				} finally {
					this.onloadend?.({ target: this });
				}
			})();
		}
	};
	(
		globalThis as unknown as { FileReader: typeof FileReader }
	).FileReader = PolyfillFileReader as unknown as typeof FileReader;
}

if (typeof globalThis.document === "undefined") {
	(
		globalThis as unknown as {
			document: { createElement: (tag: string) => Canvas };
		}
	).document = {
		createElement(tagName: string) {
			if (tagName !== "canvas") {
				throw new Error(
					`document.createElement("${tagName}") not supported in GLB export`,
				);
			}
			return createCanvas(1, 1);
		},
	};
}
