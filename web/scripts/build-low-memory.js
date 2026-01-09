#!/usr/bin/env node

/**
 * Low Memory Build Script for 2GB RAM machines
 * 
 * This script optimizes the build process for machines with limited RAM (2GB).
 * It uses aggressive memory limits and build optimizations.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Low memory build configuration
const LOW_MEMORY_CONFIG = {
	env: {
		NODE_ENV: "production",
		NEXT_TELEMETRY_DISABLED: "1",
		// Limit Node.js heap to 1.5GB to leave room for system
		NODE_OPTIONS: "--max-old-space-size=1536",
		// Disable source maps to save memory
		GENERATE_SOURCEMAP: "false",
		// Reduce TypeScript memory usage
		TS_NODE_TRANSPILE_ONLY: "true",
	},
	args: [
		"--no-lint", // Skip linting to save memory
	],
};

function checkAvailableMemory() {
	const totalMemory = require("os").totalmem();
	const freeMemory = require("os").freemem();
	const totalGB = (totalMemory / (1024 * 1024 * 1024)).toFixed(2);
	const freeGB = (freeMemory / (1024 * 1024 * 1024)).toFixed(2);

	console.log(`💾 System Memory:`);
	console.log(`   Total: ${totalGB} GB`);
	console.log(`   Free: ${freeGB} GB`);

	if (totalMemory < 2 * 1024 * 1024 * 1024) {
		console.warn(`⚠️  Warning: System has less than 2GB RAM. Build may fail.`);
	}

	if (freeMemory < 1.5 * 1024 * 1024 * 1024) {
		console.warn(`⚠️  Warning: Less than 1.5GB free memory. Consider closing other applications.`);
	}
}

function optimizeForLowMemory() {
	console.log("🔧 Applying low-memory optimizations...");

	// Clear Next.js cache to free up space
	const cacheDir = path.join(process.cwd(), ".next", "cache");
	if (fs.existsSync(cacheDir)) {
		console.log("🧹 Clearing Next.js cache...");
		fs.rmSync(cacheDir, { recursive: true, force: true });
	}

	// Clear node_modules/.cache if it exists
	const nodeModulesCache = path.join(process.cwd(), "node_modules", ".cache");
	if (fs.existsSync(nodeModulesCache)) {
		console.log("🧹 Clearing node_modules cache...");
		fs.rmSync(nodeModulesCache, { recursive: true, force: true });
	}

	// Ensure swap is available (Linux only)
	if (process.platform === "linux") {
		try {
			const swapInfo = execSync("swapon --show", { encoding: "utf8" });
			if (!swapInfo.trim()) {
				console.warn("⚠️  No swap space detected. Consider enabling swap for low-memory builds.");
			}
		} catch (error) {
			// swapon command failed, might not have swap
			console.warn("⚠️  Could not check swap space. Consider enabling swap.");
		}
	}
}

async function buildLowMemory() {
	console.log("🚀 Starting low-memory build (optimized for 2GB RAM)...\n");

	// Check available memory
	checkAvailableMemory();
	console.log("");

	// Apply optimizations
	optimizeForLowMemory();
	console.log("");

	try {
		// Generate Prisma client first (separate step to manage memory)
		console.log("📦 Step 1/3: Generating Prisma client...");
		execSync("bunx prisma generate", {
			stdio: "inherit",
			env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=512" },
		});
		console.log("✅ Prisma client generated\n");

		// Build Next.js app with low memory settings
		console.log("🏗️  Step 2/3: Building Next.js application (this may take a while)...");
		const env = { ...process.env, ...LOW_MEMORY_CONFIG.env };
		const buildArgs = ["next", "build", ...LOW_MEMORY_CONFIG.args].join(" ");

		execSync(buildArgs, {
			stdio: "inherit",
			env,
			cwd: process.cwd(),
		});
		console.log("✅ Next.js build completed\n");

		// Verify build
		console.log("🔍 Step 3/3: Verifying build...");
		if (!fs.existsSync(path.join(process.cwd(), ".next", "standalone"))) {
			throw new Error("Standalone build not found. Build may have failed.");
		}
		console.log("✅ Build verification passed\n");

		console.log("✅ Low-memory build completed successfully!");
		console.log("\n💡 Tips for future builds:");
		console.log("   - Close other applications during build");
		console.log("   - Enable swap space if not already enabled");
		console.log("   - Consider building on a machine with more RAM");
		console.log("   - Use the minimal deployment script to deploy only necessary files");
	} catch (error) {
		console.error("\n❌ Build failed:", error.message);
		console.error("\n💡 Troubleshooting:");
		console.error("   1. Ensure at least 1.5GB free memory before building");
		console.error("   2. Close other applications to free up memory");
		console.error("   3. Enable swap space: sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile");
		console.error("   4. Consider building on a machine with more RAM");
		console.error("   5. Try building in stages: generate Prisma first, then build Next.js");
		process.exit(1);
	}
}

// CLI interface
if (require.main === module) {
	buildLowMemory();
}

module.exports = { buildLowMemory, LOW_MEMORY_CONFIG };
