#!/usr/bin/env node
/**
 * Replaces t("LegacyKey") with t("canonical_key") when canonical exists in TW
 * translation.json (lodash snakeCase, plus a few known typos).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import snakeCase from "lodash/snakeCase.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const twPath = path.join(
	webRoot,
	"src/app/i18n/locales/tw/translation.json",
);

/** Keys where snakeCase(key) !== actual translation key */
const TYPO_TO_KEY = {
	FaqCategory_numofFaq: "faq_category_num_of_faq",
};

function walkSrcFiles(dir, acc = []) {
	for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, ent.name);
		if (ent.isDirectory()) {
			if (ent.name === "node_modules" || ent.name === ".next") {
				continue;
			}
			walkSrcFiles(p, acc);
		} else if (/\.(tsx|ts|jsx|js)$/.test(ent.name)) {
			acc.push(p);
		}
	}
	return acc;
}

function escapeRegExp(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function main() {
	const keys = new Set(
		Object.keys(JSON.parse(fs.readFileSync(twPath, "utf8"))),
	);
	const srcRoot = path.join(webRoot, "src");
	const files = walkSrcFiles(srcRoot);
	let fileCount = 0;
	let replCount = 0;

	for (const file of files) {
		let s = fs.readFileSync(file, "utf8");
		const orig = s;

		const re = /\bt\(\s*(["'])([^"']+)\1/g;
		let m;
		const replacements = [];
		while ((m = re.exec(orig)) !== null) {
			const quote = m[1];
			const key = m[2];
			if (key === snakeCase(key) && !TYPO_TO_KEY[key]) {
				continue;
			}
			const target =
				TYPO_TO_KEY[key] ??
				(keys.has(snakeCase(key)) ? snakeCase(key) : null);
			if (!target || target === key) {
				continue;
			}
			if (!keys.has(target)) {
				continue;
			}
			replacements.push({ key, target, quote });
		}

		for (const { key, target, quote } of replacements.sort(
			(a, b) => b.key.length - a.key.length,
		)) {
			const r = new RegExp(
				`(\\bt\\(\\s*)${quote}${escapeRegExp(key)}${quote}`,
				"g",
			);
			const next = s.replace(r, `$1${quote}${target}${quote}`);
			if (next !== s) {
				replCount += 1;
			}
			s = next;
		}

		if (s !== orig) {
			fs.writeFileSync(file, s);
			fileCount += 1;
		}
	}

	// eslint-disable-next-line no-console
	console.log(`Updated ${replCount} t() keys in ${fileCount} files.`);
}

main();
