#!/usr/bin/env node

/**
 * Migration script to fix i18n naming convention violations
 * 
 * Fixes:
 * 1. AlertDescr -> Alert_descr
 * 2. AlertTitle -> Alert_title
 * 3. createdAt -> created_at
 * 4. lastUsed -> last_used
 * 5. account_tab_currentAcct -> account_tab_current_acct
 * 6. Removes duplicate account_page_title (keeping page_title_account)
 * 
 * Usage: bun run bin/migrate-i18n-naming-violations.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Key mappings: oldKey -> newKey
const KEY_MAPPINGS = {
	// Alert dialog keys
	AlertDescr: "Alert_descr",
	AlertTitle: "Alert_title",
	
	// camelCase keys
	createdAt: "created_at",
	lastUsed: "last_used",
	account_tab_currentAcct: "account_tab_current_acct",
	
	// Note: account_page_title will be removed (duplicate of page_title_account)
};

// Translation files to update
const TRANSLATION_FILES = [
	"src/app/i18n/locales/en/translation.json",
	"src/app/i18n/locales/tw/translation.json",
];

// Keys to remove (duplicates)
const KEYS_TO_REMOVE = [
	"account_page_title", // Duplicate of page_title_account
];

/**
 * Update translation files
 */
function updateTranslationFiles() {
	console.log("\n📝 Updating translation files...");
	console.log("=".repeat(60));
	
	for (const filePath of TRANSLATION_FILES) {
		const fullPath = path.join(process.cwd(), filePath);
		
		if (!fs.existsSync(fullPath)) {
			console.error(`❌ File not found: ${filePath}`);
			continue;
		}
		
		console.log(`\nProcessing: ${filePath}`);
		
		// Read file
		const content = fs.readFileSync(fullPath, "utf8");
		const data = JSON.parse(content);
		
		let updatedCount = 0;
		let removedCount = 0;
		
		// Update keys
		const newData = {};
		for (const [key, value] of Object.entries(data)) {
			// Remove duplicate keys
			if (KEYS_TO_REMOVE.includes(key)) {
				console.log(`  🗑️  Removing duplicate key: ${key}`);
				removedCount++;
				continue;
			}
			
			// Update mapped keys
			if (KEY_MAPPINGS[key]) {
				const newKey = KEY_MAPPINGS[key];
				console.log(`  ✏️  ${key} -> ${newKey}`);
				newData[newKey] = value;
				updatedCount++;
			} else {
				newData[key] = value;
			}
		}
		
		// Write back
		fs.writeFileSync(
			fullPath,
			JSON.stringify(newData, null, 2) + "\n",
			"utf8",
		);
		
		console.log(`  ✅ Updated ${updatedCount} keys, removed ${removedCount} duplicates`);
	}
}

/**
 * Find all TypeScript/TSX files that use the old keys
 */
function findFilesWithKeys() {
	console.log("\n🔍 Finding files that use old keys...");
	console.log("=".repeat(60));
	
	const filesToUpdate = new Set();
	
	for (const oldKey of Object.keys(KEY_MAPPINGS)) {
		try {
			// Search for t("oldKey") or t('oldKey') patterns
			const results = execSync(
				`grep -r "t(\\"${oldKey}\\")" "src/" --include="*.ts" --include="*.tsx" || true`,
				{ encoding: "utf8", stdio: "pipe" }
			);
			
			// Also search for t('oldKey') pattern
			const results2 = execSync(
				`grep -r "t('${oldKey}')" "src/" --include="*.ts" --include="*.tsx" || true`,
				{ encoding: "utf8", stdio: "pipe" }
			);
			
			// Also search for ["oldKey"] pattern (object access)
			const results3 = execSync(
				`grep -r "\\"${oldKey}\\"" "src/" --include="*.ts" --include="*.tsx" || true`,
				{ encoding: "utf8", stdio: "pipe" }
			);
			
			const allResults = [results, results2, results3].join("\n");
			
			if (allResults.trim()) {
				const lines = allResults.trim().split("\n").filter(Boolean);
				lines.forEach((line) => {
					const match = line.match(/^(src\/[^:]+):/);
					if (match) {
						filesToUpdate.add(match[1]);
					}
				});
				
				console.log(`\n  Found usages of "${oldKey}":`);
				lines.forEach((line) => {
					console.log(`    ${line}`);
				});
			}
		} catch (error) {
			// grep returns non-zero exit code when no matches found - this is fine
			if (error.status !== 1) {
				console.error(`  ⚠️  Error searching for "${oldKey}":`, error.message);
			}
		}
	}
	
	// Check for removed keys
	for (const keyToRemove of KEYS_TO_REMOVE) {
		try {
			const results = execSync(
				`grep -r "t(\\"${keyToRemove}\\")" "src/" --include="*.ts" --include="*.tsx" || true`,
				{ encoding: "utf8", stdio: "pipe" }
			);
			
			if (results.trim()) {
				const lines = results.trim().split("\n").filter(Boolean);
				lines.forEach((line) => {
					const match = line.match(/^(src\/[^:]+):/);
					if (match) {
						filesToUpdate.add(match[1]);
					}
				});
				
				console.log(`\n  ⚠️  Found usages of removed key "${keyToRemove}":`);
				lines.forEach((line) => {
					console.log(`    ${line}`);
				});
			}
		} catch (error) {
			if (error.status !== 1) {
				console.error(`  ⚠️  Error searching for "${keyToRemove}":`, error.message);
			}
		}
	}
	
	return Array.from(filesToUpdate);
}

/**
 * Update a source file to use new keys
 */
function updateSourceFile(filePath) {
	const fullPath = path.join(process.cwd(), filePath);
	
	if (!fs.existsSync(fullPath)) {
		console.error(`❌ File not found: ${filePath}`);
		return false;
	}
	
	let content = fs.readFileSync(fullPath, "utf8");
	let updated = false;
	
	// Update each key mapping
	for (const [oldKey, newKey] of Object.entries(KEY_MAPPINGS)) {
		// Update t("oldKey") -> t("newKey")
		const regex1 = new RegExp(`t\\(["']${oldKey}["']\\)`, "g");
		if (regex1.test(content)) {
			content = content.replace(regex1, `t("${newKey}")`);
			updated = true;
		}
		
		// Update ["oldKey"] -> ["newKey"] (object access)
		const regex2 = new RegExp(`\\["${oldKey}"\\]`, "g");
		if (regex2.test(content)) {
			content = content.replace(regex2, `["${newKey}"]`);
			updated = true;
		}
		
		// Update ['oldKey'] -> ['newKey']
		const regex3 = new RegExp(`\\['${oldKey}'\\]`, "g");
		if (regex3.test(content)) {
			content = content.replace(regex3, `['${newKey}']`);
			updated = true;
		}
	}
	
	// Update removed keys (account_page_title -> page_title_account)
	for (const removedKey of KEYS_TO_REMOVE) {
		if (removedKey === "account_page_title") {
			// Replace with page_title_account
			const regex = new RegExp(`t\\(["']${removedKey}["']\\)`, "g");
			if (regex.test(content)) {
				content = content.replace(regex, 't("page_title_account")');
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
	console.log("🚀 Starting i18n naming convention migration...");
	console.log("=".repeat(60));
	
	// Step 1: Update translation files
	updateTranslationFiles();
	
	// Step 2: Find files that need updating
	const filesToUpdate = findFilesWithKeys();
	
	if (filesToUpdate.length === 0) {
		console.log("\n✅ No source files need updating!");
		return;
	}
	
	console.log(`\n📝 Found ${filesToUpdate.length} file(s) to update:`);
	filesToUpdate.forEach((file) => {
		console.log(`  - ${file}`);
	});
	
	// Step 3: Update source files
	console.log("\n✏️  Updating source files...");
	console.log("=".repeat(60));
	
	let updatedCount = 0;
	for (const file of filesToUpdate) {
		if (updateSourceFile(file)) {
			console.log(`  ✅ Updated: ${file}`);
			updatedCount++;
		}
	}
	
	// Summary
	console.log("\n" + "=".repeat(60));
	console.log("✨ Migration complete!");
	console.log(`\nSummary:`);
	console.log(`  - Translation files updated: ${TRANSLATION_FILES.length}`);
	console.log(`  - Source files updated: ${updatedCount}`);
	console.log(`  - Keys renamed: ${Object.keys(KEY_MAPPINGS).length}`);
	console.log(`  - Keys removed: ${KEYS_TO_REMOVE.length}`);
	
	console.log("\n📋 Next steps:");
	console.log("  1. Review the changes");
	console.log("  2. Test the application");
	console.log("  3. Verify translations display correctly");
	console.log("  4. Commit the changes");
	
	console.log("\n⚠️  Important:");
	console.log("  - Check that all translation keys are correctly updated");
	console.log("  - Verify no TypeScript errors after changes");
	console.log("  - Test UI in both English and Traditional Chinese");
}

if (require.main === module) {
	try {
		main();
	} catch (error) {
		console.error("\n❌ Migration failed:", error);
		process.exit(1);
	}
}

module.exports = { KEY_MAPPINGS, KEYS_TO_REMOVE, updateTranslationFiles, updateSourceFile };

