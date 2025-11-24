#!/usr/bin/env node

/**
 * Script to update code references to refactored i18n keys
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const { keyMappings } = require("./refactor-i18n-keys-manual.js");

/**
 * Find files that use old translation keys
 */
function findFilesWithKey(key) {
	try {
		const result = execSync(
			`grep -r "${key}" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -l`,
			{ encoding: "utf8", cwd: process.cwd() }
		);
		return result.trim().split("\n").filter(Boolean);
	} catch (error) {
		return [];
	}
}

/**
 * Update a file to replace old keys with new keys
 */
function updateFile(filePath, mappings) {
	const fullPath = path.join(process.cwd(), filePath);
	let content = fs.readFileSync(fullPath, "utf8");
	let updated = false;
	
	for (const [oldKey, newKey] of Object.entries(mappings)) {
		// Match various patterns: t("key"), t('key'), t(`key`)
		const patterns = [
			new RegExp(`t\\(["']${oldKey.replace(/_/g, "_")}["']\\)`, "g"),
			new RegExp(`t\\(\`${oldKey.replace(/_/g, "_")}\`\\)`, "g"),
			new RegExp(`["']${oldKey.replace(/_/g, "_")}["']`, "g"),
		];
		
		for (const pattern of patterns) {
			if (pattern.test(content)) {
				content = content.replace(pattern, (match) => {
					return match.replace(oldKey, newKey);
				});
				updated = true;
			}
		}
	}
	
	if (updated) {
		fs.writeFileSync(fullPath, content, "utf8");
		return true;
	}
	
	return false;
}

/**
 * Main execution
 */
function main() {
	console.log("Finding and updating code references to i18n keys...");
	console.log("=".repeat(60));
	
	const filesToUpdate = new Set();
	
	// Find all files that use old keys
	for (const oldKey of Object.keys(keyMappings)) {
		const files = findFilesWithKey(oldKey);
		files.forEach((file) => filesToUpdate.add(file));
	}
	
	console.log(`\nFound ${filesToUpdate.size} files to update`);
	
	let updatedCount = 0;
	for (const file of filesToUpdate) {
		console.log(`\nUpdating: ${file}`);
		if (updateFile(file, keyMappings)) {
			updatedCount++;
			console.log(`  ✓ Updated`);
		} else {
			console.log(`  - No changes needed`);
		}
	}
	
	console.log("\n" + "=".repeat(60));
	console.log(`\nUpdated ${updatedCount} files`);
	console.log("\nPlease review the changes and test the application.");
}

if (require.main === module) {
	main();
}

module.exports = { findFilesWithKey, updateFile };

