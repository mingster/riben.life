#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Build optimization script
console.log("🚀 Starting build optimization...");

// Check if we're in production mode
const isProduction = process.env.NODE_ENV === "production";

// Clean cache if needed
if (process.argv.includes("--clean-cache")) {
	console.log("🧹 Cleaning cache...");
	execSync("rm -rf .next/cache node_modules/.cache", { stdio: "inherit" });
}

// Analyze bundle if requested
if (process.argv.includes("--analyze")) {
	console.log("📊 Analyzing bundle...");
	process.env.ANALYZE = "true";
}

// Set build optimizations
process.env.NEXT_TELEMETRY_DISABLED = "1";
//process.env.NODE_ENV = isProduction ? 'production' : 'development';

// Run the build
try {
	console.log("🔨 Starting build...");
	const startTime = Date.now();

	execSync("bun run postinstall:parallel", { stdio: "inherit" });
	execSync("next build", { stdio: "inherit" });

	const endTime = Date.now();
	const buildTime = (endTime - startTime) / 1000;

	console.log(`✅ Build completed in ${buildTime.toFixed(2)} seconds`);

	// Show build stats
	if (fs.existsSync(".next/build-manifest.json")) {
		const manifest = JSON.parse(
			fs.readFileSync(".next/build-manifest.json", "utf8"),
		);
		const pages = Object.keys(manifest.pages).length;
		console.log(`📄 Built ${pages} pages`);
	}
} catch (error) {
	console.error("❌ Build failed:", error.message);
	process.exit(1);
}
