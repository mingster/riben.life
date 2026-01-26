import sharp from "sharp";
import { join } from "path";

const faviconsDir = join(process.cwd(), "public", "favicons");
const fileServerDir = join(process.cwd(), "..", "fileServer");
const outputPath = join(fileServerDir, "favicon-200x200.png");

// Use apple-touch-icon (180x180) as source—best quality for upscaling to 200
const sourcePath = join(faviconsDir, "apple-touch-icon.png");

async function createFavicon200() {
  await sharp(sourcePath)
    .resize(200, 200, {
      kernel: sharp.kernel.lanczos3,
    })
    .png({
      quality: 100,
      compressionLevel: 9,
      palette: false,
    })
    .toFile(outputPath);

  console.log(`✓ Created favicon-200x200.png at ${outputPath}`);
}

createFavicon200().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
