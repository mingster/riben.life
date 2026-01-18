import sharp from "sharp";
import { readFileSync } from "fs";
import { join } from "path";

const logoPath = join(process.cwd(), "public", "logo.svg");
const faviconsDir = join(process.cwd(), "public", "favicons");

// Sizes needed for various platforms
const faviconSizes = [
	{ name: "favicon-16x16.png", size: 16 },
	{ name: "favicon-32x32.png", size: 32 },
	{ name: "android-chrome-48x48.png", size: 48 },
	{ name: "apple-touch-icon.png", size: 180 }, // Apple requires 180x180
	{ name: "mstile-150x150.png", size: 150 },
];

async function generateFavicons() {
	console.log("Reading SVG logo from:", logoPath);
	const svgBuffer = readFileSync(logoPath);

	console.log("Generating favicons...");

	// Generate PNG files at different sizes
	for (const { name, size } of faviconSizes) {
		const outputPath = join(faviconsDir, name);
		await sharp(svgBuffer)
			.resize(size, size, {
				kernel: sharp.kernel.lanczos3, // High-quality resampling
			})
			.png({
				quality: 100,
				compressionLevel: 9,
				palette: false, // Use true color
			})
			.toFile(outputPath);

		console.log(`✓ Generated ${name} (${size}x${size})`);
	}

	// Generate favicon.ico
	// Since sharp doesn't natively support ICO format, we'll use the 32x32 PNG
	// Most modern browsers accept PNG files with .ico extension
	// For older browsers, this provides a fallback
	const icoOutputPath = join(faviconsDir, "favicon.ico");
	const png32Path = join(faviconsDir, "favicon-32x32.png");
	const png32Buffer = readFileSync(png32Path);
	await sharp(png32Buffer)
		.png()
		.toFile(icoOutputPath);

	console.log("✓ Generated favicon.ico");

	console.log("\n✅ All favicons generated successfully!");
	console.log(`Output directory: ${faviconsDir}`);
}

generateFavicons().catch((error) => {
	console.error("Error generating favicons:", error);
	process.exit(1);
});
