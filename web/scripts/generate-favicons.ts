#!/usr/bin/env bun
/**
 * Generates favicons and PWA icons from the repo-root riben.life pattern asset.
 *
 * Run from `web/`: `bun run generate:favicons`
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDir = dirname(fileURLToPath(import.meta.url));
/** `riben.life/asset/pattern.jpg` */
const sourcePath = join(scriptDir, "..", "..", "asset", "pattern.jpg");
const faviconsDir = join(scriptDir, "..", "public", "favicons");

const faviconSizes = [
	{ name: "favicon-16x16.png", size: 16 },
	{ name: "favicon-32x32.png", size: 32 },
	{ name: "android-chrome-48x48.png", size: 48 },
	{ name: "apple-touch-icon.png", size: 180 },
	{ name: "mstile-150x150.png", size: 150 },
	{ name: "android-chrome-192x192.png", size: 192 },
	{ name: "android-chrome-512x512.png", size: 512 },
];

async function generateFavicons(): Promise<void> {
	if (!existsSync(sourcePath)) {
		console.error("Source image not found:", sourcePath);
		process.exit(1);
	}

	console.log("Source:", sourcePath);
	const input = readFileSync(sourcePath);
	console.log("Generating favicons (square cover, center)…\n");

	const pipelineForSize = (size: number) =>
		sharp(input)
			.rotate()
			.resize(size, size, { fit: "cover", position: "centre" })
			.png({
				quality: 100,
				compressionLevel: 9,
				palette: false,
			});

	for (const { name, size } of faviconSizes) {
		const outputPath = join(faviconsDir, name);
		await pipelineForSize(size).toFile(outputPath);
		console.log(`✓ ${name} (${size}×${size})`);
	}

	const icoOutputPath = join(faviconsDir, "favicon.ico");
	const png32Path = join(faviconsDir, "favicon-32x32.png");
	await sharp(readFileSync(png32Path)).png().toFile(icoOutputPath);
	console.log("✓ favicon.ico (from 32×32 PNG)\n");

	console.log("Done:", faviconsDir);
}

generateFavicons().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
