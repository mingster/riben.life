#!/usr/bin/env node

/**
 * Script to refactor i18n translation keys to follow naming convention:
 * - DOMAIN and ENTITY: PascalCase
 * - CONTEXT and MODIFIER: snake_case
 */

const fs = require("fs");
const path = require("path");

const translationFiles = [
	"src/app/i18n/locales/en/translation.json",
	"src/app/i18n/locales/tw/translation.json",
];

// Mapping of PascalCase context/modifiers to snake_case
// These are known context/modifier words that should be snake_case
const contextModifierMap = {
	Mgmt: "mgmt",
	Descr: "descr",
	Add: "add",
	Edit: "edit",
	Button: "button",
	Created: "created",
	Updated: "updated",
	Deleted: "deleted",
	Description: "description",
	Prefix: "prefix",
};

// Known compound modifiers that should be split
const compoundModifiers = {
	AddButton: "add_button",
	BulkAdd: "bulk_add",
	AddDescr: "add_descr",
	AddFaq: "add_faq",
	EditProducts: "edit_products",
	NumToAdd: "num_to_add",
};

/**
 * Convert a key to follow the naming convention
 */
function refactorKey(key) {
	// Skip if already all lowercase (simple keys like "actions", "name")
	if (key === key.toLowerCase()) {
		return key;
	}
	
	// Check for known compound modifiers first
	for (const [compound, replacement] of Object.entries(compoundModifiers)) {
		if (key.includes(`_${compound}_`) || key.endsWith(`_${compound}`)) {
			key = key.replace(`_${compound}_`, `_${replacement}_`).replace(`_${compound}`, `_${replacement}`);
		}
	}
	
	// Split by underscore
	const parts = key.split("_");
	
	// Process each part
	const refactoredParts = parts.map((part, index) => {
		// First part is DOMAIN or ENTITY (PascalCase) - keep as is
		if (index === 0) {
			return part;
		}
		
		// Check if this part is already snake_case (all lowercase)
		if (part === part.toLowerCase()) {
			return part;
		}
		
		// Check if this part matches any known context/modifier pattern
		for (const [pascalCase, snakeCase] of Object.entries(contextModifierMap)) {
			if (part === pascalCase) {
				return snakeCase;
			}
		}
		
		// Check for compound modifiers like "AddButton", "BulkAdd", "BulkAddButton"
		// Sort by length (longest first) to match "BulkAddButton" before "BulkAdd"
		const sortedCompounds = Object.entries(compoundModifiers).sort(
			(a, b) => b[0].length - a[0].length
		);
		for (const [compound, replacement] of sortedCompounds) {
			if (part === compound) {
				return replacement;
			}
		}
		
		// If part is PascalCase but not a known modifier, it might be a field name
		// Keep it as PascalCase (it's part of ENTITY or a field name)
		// Only convert if it's clearly a modifier pattern
		if (/^[A-Z][a-z]+$/.test(part)) {
			// Single PascalCase word - could be field name or modifier
			// Check if it's a known modifier word
			const lower = part.toLowerCase();
			if (["add", "edit", "delete", "create", "update", "button", "descr", "mgmt"].includes(lower)) {
				return lower;
			}
			// Otherwise keep as PascalCase (it's a field name)
			return part;
		}
		
		// Keep as is for other cases
		return part;
	});
	
	return refactoredParts.join("_");
}

/**
 * Process a translation file
 */
function processTranslationFile(filePath) {
	console.log(`\nProcessing: ${filePath}`);
	
	const fullPath = path.join(process.cwd(), filePath);
	const content = fs.readFileSync(fullPath, "utf8");
	const data = JSON.parse(content);
	
	const keyMapping = {};
	const newData = {};
	let refactoredCount = 0;
	
	// Process each key
	for (const [key, value] of Object.entries(data)) {
		const newKey = refactorKey(key);
		
		if (newKey !== key) {
			keyMapping[key] = newKey;
			newData[newKey] = value;
			refactoredCount++;
			console.log(`  ${key} -> ${newKey}`);
		} else {
			newData[key] = value;
		}
	}
	
	console.log(`\nRefactored ${refactoredCount} keys`);
	
	// Write back to file
	fs.writeFileSync(
		fullPath,
		JSON.stringify(newData, null, 2) + "\n",
		"utf8",
	);
	
	return { keyMapping, refactoredCount };
}

/**
 * Main execution
 */
function main() {
	console.log("Starting i18n key refactoring...");
	console.log("=".repeat(60));
	
	const allMappings = {};
	
	for (const file of translationFiles) {
		const { keyMapping } = processTranslationFile(file);
		Object.assign(allMappings, keyMapping);
	}
	
	// Generate a mapping file for code updates
	const mappingPath = path.join(process.cwd(), "bin/i18n-key-mapping.json");
	fs.writeFileSync(
		mappingPath,
		JSON.stringify(allMappings, null, 2) + "\n",
		"utf8",
	);
	
	console.log("\n" + "=".repeat(60));
	console.log(`\nGenerated mapping file: ${mappingPath}`);
	console.log(`Total keys refactored: ${Object.keys(allMappings).length}`);
	console.log("\nNext steps:");
	console.log("1. Review the changes in translation files");
	console.log("2. Use the mapping file to update code references");
	console.log("3. Run: grep -r 'OLD_KEY' src/ to find code references");
}

if (require.main === module) {
	main();
}

module.exports = { refactorKey, processTranslationFile };

