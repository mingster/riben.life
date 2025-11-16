#!/usr/bin/env node

/**
 * Cache Optimization Script
 *
 * This script optimizes various caches to improve build performance.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Cache directories to optimize
const CACHE_DIRS = [
	".next/cache",
	".bun-cache",
	"node_modules/.cache",
	".turbo",
];

// Files to clean
const CLEAN_PATTERNS = [
	"**/*.tsbuildinfo",
	"**/*.cache",
	"**/*.tmp",
	"**/*.log",
];

class CacheOptimizer {
	constructor() {
		this.cleanedFiles = 0;
		this.cleanedDirs = 0;
		this.freedSpace = 0;
	}

	// Get directory size
	getDirSize(dirPath) {
		if (!fs.existsSync(dirPath)) return 0;

		let size = 0;
		const files = fs.readdirSync(dirPath);

		for (const file of files) {
			const filePath = path.join(dirPath, file);
			const stats = fs.statSync(filePath);

			if (stats.isDirectory()) {
				size += this.getDirSize(filePath);
			} else {
				size += stats.size;
			}
		}

		return size;
	}

	// Format bytes
	formatBytes(bytes) {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	}

	// Clean old cache files
	cleanOldCache(dirPath, maxAge = 7 * 24 * 60 * 60 * 1000) {
		// 7 days
		if (!fs.existsSync(dirPath)) return;

		const cutoffTime = Date.now() - maxAge;

		const cleanDir = (dir) => {
			const files = fs.readdirSync(dir);

			for (const file of files) {
				const filePath = path.join(dir, file);
				const stats = fs.statSync(filePath);

				if (stats.isDirectory()) {
					cleanDir(filePath);
					// Remove empty directories
					try {
						if (fs.readdirSync(filePath).length === 0) {
							fs.rmdirSync(filePath);
							this.cleanedDirs++;
						}
					} catch (error) {
						// Directory not empty or other error
					}
				} else if (stats.mtime.getTime() < cutoffTime) {
					this.freedSpace += stats.size;
					fs.unlinkSync(filePath);
					this.cleanedFiles++;
				}
			}
		};

		cleanDir(dirPath);
	}

	// Optimize Next.js cache
	optimizeNextCache() {
		console.log("🧹 Optimizing Next.js cache...");

		const nextCacheDir = path.join(process.cwd(), ".next", "cache");
		if (fs.existsSync(nextCacheDir)) {
			const beforeSize = this.getDirSize(nextCacheDir);
			this.cleanOldCache(nextCacheDir, 3 * 24 * 60 * 60 * 1000); // 3 days
			const afterSize = this.getDirSize(nextCacheDir);

			console.log(
				`📊 Next.js cache: ${this.formatBytes(beforeSize)} → ${this.formatBytes(afterSize)}`,
			);
		}
	}

	// Optimize Bun cache
	optimizeBunCache() {
		console.log("🧹 Optimizing Bun cache...");

		const bunCacheDir = path.join(process.cwd(), ".bun-cache");
		if (fs.existsSync(bunCacheDir)) {
			const beforeSize = this.getDirSize(bunCacheDir);
			this.cleanOldCache(bunCacheDir, 7 * 24 * 60 * 60 * 1000); // 7 days
			const afterSize = this.getDirSize(bunCacheDir);

			console.log(
				`📊 Bun cache: ${this.formatBytes(beforeSize)} → ${this.formatBytes(afterSize)}`,
			);
		}
	}

	// Optimize node_modules cache
	optimizeNodeModulesCache() {
		console.log("🧹 Optimizing node_modules cache...");

		const nodeModulesCacheDir = path.join(
			process.cwd(),
			"node_modules",
			".cache",
		);
		if (fs.existsSync(nodeModulesCacheDir)) {
			const beforeSize = this.getDirSize(nodeModulesCacheDir);
			this.cleanOldCache(nodeModulesCacheDir, 1 * 24 * 60 * 60 * 1000); // 1 day
			const afterSize = this.getDirSize(nodeModulesCacheDir);

			console.log(
				`📊 node_modules cache: ${this.formatBytes(beforeSize)} → ${this.formatBytes(afterSize)}`,
			);
		}
	}

	// Optimize TypeScript build info
	optimizeTypeScriptCache() {
		console.log("🧹 Optimizing TypeScript cache...");

		const tsBuildInfoFile = path.join(
			process.cwd(),
			".next",
			"cache",
			"tsbuildinfo",
		);
		if (fs.existsSync(tsBuildInfoFile)) {
			const stats = fs.statSync(tsBuildInfoFile);
			const age = Date.now() - stats.mtime.getTime();

			// Remove if older than 1 day
			if (age > 24 * 60 * 60 * 1000) {
				this.freedSpace += stats.size;
				fs.unlinkSync(tsBuildInfoFile);
				this.cleanedFiles++;
				console.log("🗑️  Removed old TypeScript build info");
			}
		}
	}

	// Warm up caches
	warmupCaches() {
		console.log("🔥 Warming up caches...");

		try {
			// Pre-compile TypeScript
			console.log("📝 Pre-compiling TypeScript...");
			execSync("bunx tsc --noEmit", { stdio: "pipe" });

			// Pre-generate Prisma clients
			console.log("📦 Pre-generating Prisma clients...");
			execSync("bun run postinstall:parallel", { stdio: "pipe" });

			console.log("✅ Cache warmup completed");
		} catch (error) {
			console.warn("⚠️  Cache warmup had some issues, but continuing...");
		}
	}

	// Run all optimizations
	async optimize() {
		console.log("🚀 Starting cache optimization...");

		const startTime = Date.now();

		// Optimize various caches
		this.optimizeNextCache();
		this.optimizeBunCache();
		this.optimizeNodeModulesCache();
		this.optimizeTypeScriptCache();

		// Warm up caches
		this.warmupCaches();

		const endTime = Date.now();
		const duration = endTime - startTime;

		console.log("\n📈 Cache Optimization Summary:");
		console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
		console.log(`🗑️  Files cleaned: ${this.cleanedFiles}`);
		console.log(`📁 Directories cleaned: ${this.cleanedDirs}`);
		console.log(`💾 Space freed: ${this.formatBytes(this.freedSpace)}`);

		if (this.freedSpace > 0) {
			console.log("✅ Cache optimization completed successfully!");
		} else {
			console.log("✅ Cache was already optimized");
		}
	}
}

// CLI interface
if (require.main === module) {
	const optimizer = new CacheOptimizer();
	optimizer.optimize().catch(console.error);
}

module.exports = { CacheOptimizer };
