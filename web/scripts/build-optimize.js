#!/usr/bin/env node

/**
 * Build Optimization Script
 *
 * This script provides various build optimizations and performance monitoring
 * for the Next.js application.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Build optimization configurations
const BUILD_CONFIGS = {
	// Standard optimized build
	optimized: {
		env: {
			NEXT_TELEMETRY_DISABLED: "1",
			NODE_OPTIONS: "--max-old-space-size=4096",
		},
		args: [],
	},

	// Fast build with minimal features
	fast: {
		env: {
			NEXT_TELEMETRY_DISABLED: "1",
			NODE_OPTIONS: "--max-old-space-size=2048",
		},
		args: ["--no-lint"],
	},

	// Production build with all optimizations
	production: {
		env: {
			NODE_ENV: "production",
			NEXT_TELEMETRY_DISABLED: "1",
			NODE_OPTIONS: "--max-old-space-size=4096",
		},
		args: [],
	},
};

// Performance monitoring
class BuildPerformanceMonitor {
	constructor() {
		this.startTime = Date.now();
		this.memoryUsage = process.memoryUsage();
	}

	start() {
		this.startTime = Date.now();
		this.memoryUsage = process.memoryUsage();
		console.log("🚀 Starting optimized build...");
		console.log(
			`📊 Initial memory usage: ${this.formatBytes(this.memoryUsage.heapUsed)}`,
		);
	}

	end() {
		const endTime = Date.now();
		const duration = endTime - this.startTime;
		const finalMemoryUsage = process.memoryUsage();

		console.log("\n📈 Build Performance Summary:");
		console.log(`⏱️  Total build time: ${(duration / 1000).toFixed(2)}s`);
		console.log(
			`📊 Memory usage: ${this.formatBytes(finalMemoryUsage.heapUsed)}`,
		);
		console.log(
			`📈 Memory delta: ${this.formatBytes(finalMemoryUsage.heapUsed - this.memoryUsage.heapUsed)}`,
		);

		// Save performance data
		this.savePerformanceData(duration, finalMemoryUsage);
	}

	formatBytes(bytes) {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	}

	savePerformanceData(duration, memoryUsage) {
		const performanceData = {
			timestamp: new Date().toISOString(),
			duration,
			memoryUsage: {
				heapUsed: memoryUsage.heapUsed,
				heapTotal: memoryUsage.heapTotal,
				external: memoryUsage.external,
				rss: memoryUsage.rss,
			},
		};

		const performanceFile = path.join(
			process.cwd(),
			".next",
			"build-performance.json",
		);
		const dir = path.dirname(performanceFile);

		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		let existingData = [];
		if (fs.existsSync(performanceFile)) {
			try {
				existingData = JSON.parse(fs.readFileSync(performanceFile, "utf8"));
			} catch (error) {
				console.warn("⚠️  Could not read existing performance data");
			}
		}

		existingData.push(performanceData);

		// Keep only last 10 builds
		if (existingData.length > 10) {
			existingData = existingData.slice(-10);
		}

		fs.writeFileSync(performanceFile, JSON.stringify(existingData, null, 2));
		console.log(`💾 Performance data saved to ${performanceFile}`);
	}
}

// Cache optimization
function optimizeCache() {
	console.log("🧹 Optimizing build cache...");

	const cacheDir = path.join(process.cwd(), ".next", "cache");
	if (fs.existsSync(cacheDir)) {
		// Clean old cache files (older than 7 days)
		const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

		function cleanOldFiles(dir) {
			const files = fs.readdirSync(dir);
			files.forEach((file) => {
				const filePath = path.join(dir, file);
				const stats = fs.statSync(filePath);

				if (stats.isDirectory()) {
					cleanOldFiles(filePath);
				} else if (stats.mtime.getTime() < sevenDaysAgo) {
					fs.unlinkSync(filePath);
					console.log(`🗑️  Removed old cache file: ${file}`);
				}
			});
		}

		cleanOldFiles(cacheDir);
	}
}

// Prisma optimization
function optimizePrisma() {
	console.log("🔧 Generating Prisma client...");

	// Only generate for schemas that actually exist
	const prismaSchemas = [
		"./prisma/schema.prisma",
		"./prisma-pstv/schema.prisma",
		"./prisma-epg/schema.prisma",
		"./prisma-enterprise/schema.prisma",
		"./prisma-viewLog/schema.prisma",
	].filter((schema) => {
		const schemaPath = path.join(process.cwd(), schema);
		return fs.existsSync(schemaPath);
	});

	if (prismaSchemas.length === 0) {
		console.warn("⚠️  No Prisma schemas found, skipping Prisma generation");
		return Promise.resolve();
	}

	console.log(`📦 Found ${prismaSchemas.length} Prisma schema(s)`);

	const generatePromises = prismaSchemas.map((schema) => {
		return new Promise((resolve, reject) => {
			try {
				execSync(`bunx prisma generate --schema ${schema}`, {
					stdio: "inherit",
					env: { ...process.env, PRISMA_GENERATE_SKIP_AUTOINSTALL: "true" },
				});
				console.log(`✅ Generated Prisma client for ${schema}`);
				resolve();
			} catch (error) {
				console.error(`❌ Failed to generate Prisma client for ${schema}:`, error.message);
				reject(error);
			}
		});
	});

	return Promise.all(generatePromises);
}

// Main build function
async function build(configName = "optimized") {
	const config = BUILD_CONFIGS[configName];
	if (!config) {
		console.error(`❌ Unknown build config: ${configName}`);
		console.log("Available configs:", Object.keys(BUILD_CONFIGS).join(", "));
		process.exit(1);
	}

	const monitor = new BuildPerformanceMonitor();
	monitor.start();

	try {
		// Clean build directory for production builds to avoid Turbopack artifacts
		if (configName === "production") {
			const buildDir = path.join(process.cwd(), ".next");
			if (fs.existsSync(buildDir)) {
				console.log("🧹 Cleaning .next directory for clean production build...");
				fs.rmSync(buildDir, { recursive: true, force: true });
			}
		}

		// Optimize cache
		optimizeCache();

		// Generate Prisma client
		await optimizePrisma();

		// Set environment variables
		const env = { ...process.env, ...config.env };

		// Build Next.js app
		console.log("🏗️  Building Next.js application...");
		const buildArgs = ["next", "build", ...config.args].join(" ");

		execSync(buildArgs, {
			stdio: "inherit",
			env,
			cwd: process.cwd(),
		});

		monitor.end();
		console.log("✅ Build completed successfully!");
	} catch (error) {
		console.error("❌ Build failed:", error.message);
		process.exit(1);
	}
}

// CLI interface
if (require.main === module) {
	const configName = process.argv[2] || "optimized";
	build(configName);
}

module.exports = { build, BUILD_CONFIGS, BuildPerformanceMonitor };
