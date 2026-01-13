#!/usr/bin/env node

/**
 * Script to convert all i18n translation keys to snake_case
 * This script:
 * 1. Identifies all keys that violate snake_case (PascalCase, camelCase, mixed case)
 * 2. Converts them to snake_case
 * 3. Updates both en and tw translation files
 * 4. Outputs a mapping file for code updates
 */

const fs = require("fs");
const path = require("path");

// Helper function to convert to snake_case
function toSnakeCase(str) {
  return str
    .replace(/([A-Z])/g, "_$1") // Insert underscore before uppercase letters
    .replace(/^_/, "") // Remove leading underscore
    .toLowerCase() // Convert to lowercase
    .replace(/_+/g, "_") // Replace multiple underscores with single
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
}

// Read translation files
const enFile = path.join(__dirname, "../src/app/i18n/locales/en/translation.json");
const twFile = path.join(__dirname, "../src/app/i18n/locales/tw/translation.json");

const enContent = JSON.parse(fs.readFileSync(enFile, "utf8"));
const twContent = JSON.parse(fs.readFileSync(twFile, "utf8"));

// Find violations and create mapping
const keyMapping = {};
const violations = [];
const newKeysSet = new Set();

for (const key of Object.keys(enContent)) {
  // Check for violations
  const isPascalCase = /^[A-Z]/.test(key);
  const isCamelCase = /[a-z][A-Z]/.test(key);
  
  if (isPascalCase || isCamelCase) {
    const newKey = toSnakeCase(key);
    if (newKey !== key) {
      // Check for conflicts
      if (newKeysSet.has(newKey)) {
        console.warn(`⚠️  Conflict: ${key} -> ${newKey} (already exists)`);
        // Skip this key to avoid overwriting
        continue;
      }
      
      // Check if new key already exists in content (would cause duplicate)
      if (enContent[newKey] !== undefined && enContent[newKey] !== enContent[key]) {
        console.warn(`⚠️  Conflict: ${key} -> ${newKey} (target key already exists with different value)`);
        continue;
      }
      
      keyMapping[key] = newKey;
      newKeysSet.add(newKey);
      violations.push({ old: key, new: newKey, type: isPascalCase ? "PascalCase" : "camelCase" });
    }
  }
}

console.log(`Found ${violations.length} violations to fix`);

// Create new translation objects with snake_case keys
const newEnContent = {};
const newTwContent = {};

// Process all keys (both violations and non-violations)
const allKeys = new Set([...Object.keys(enContent), ...Object.keys(twContent)]);

for (const oldKey of allKeys) {
  const newKey = keyMapping[oldKey] || oldKey;
  
  if (enContent[oldKey] !== undefined) {
    newEnContent[newKey] = enContent[oldKey];
  }
  
  if (twContent[oldKey] !== undefined) {
    newTwContent[newKey] = twContent[oldKey];
  }
}

// Write updated files
fs.writeFileSync(enFile, JSON.stringify(newEnContent, null, 2) + "\n", "utf8");
fs.writeFileSync(twFile, JSON.stringify(newTwContent, null, 2) + "\n", "utf8");

// Write mapping file for code updates
const mappingFile = path.join(__dirname, "../bin/i18n-key-mapping-snake-case.json");
fs.writeFileSync(mappingFile, JSON.stringify(keyMapping, null, 2) + "\n", "utf8");

console.log(`\n✅ Updated translation files:`);
console.log(`   - ${enFile}`);
console.log(`   - ${twFile}`);
console.log(`\n📝 Key mapping saved to: ${mappingFile}`);
console.log(`\n⚠️  Next step: Update all code references using the mapping file`);
