#!/usr/bin/env node
/**
 * Normalizes i18n JSON keys to snake_case (lodash snakeCase), merges duplicate
 * legacy + snake entries when values match, and records old→new for codemod.
 *
 * Conflict keys (different values for same canonical): legacy value is stored
 * under an explicit snake_case alias; canonical keeps the existing snake entry.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import snakeCase from "lodash/snakeCase.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const localesDir = path.join(webRoot, "src/app/i18n/locales");

function isStrictSnake(k) {
	return /^[a-z][a-z0-9_]*$/.test(k) && k === snakeCase(k);
}

function normVal(v) {
	return String(v).trim().toLowerCase();
}

/** @type {Record<string, string>} */
const CONFLICT_LEGACY_TO_NEW = {
	Categories: "categories_management",
	Order_number: "order_number_short",
	Order_pickupCode: "order_pickup_code_plain",
	rsvp_Prepaid_Required: "rsvp_prepaid_required_title",
	Settings: "settings_store",
	Add: "add_new",
	StoreSettings_use_order_system: "store_settings_use_order_system_short_label",
	StoreSettings_use_order_system_descr: "store_settings_use_order_system_short_descr",
	StoreSettings_WaitingList: "store_settings_waiting_list",
	Waiting_List: "waiting_list",
};

function normalizeJson(json) {
	const out = /** @type {Record<string, string>} */ ({});
	const repl = /** @type {Record<string, string>} */ ({});

	for (const [k, v] of Object.entries(json)) {
		if (isStrictSnake(k)) {
			out[k] = v;
		}
	}

	for (const [k, v] of Object.entries(json)) {
		if (isStrictSnake(k)) {
			continue;
		}
		const c = snakeCase(k);
		if (out[c] === undefined) {
			out[c] = v;
			if (k !== c) {
				repl[k] = c;
			}
			continue;
		}
		if (out[c] === v || normVal(out[c]) === normVal(v)) {
			repl[k] = c;
			continue;
		}
		let alt = CONFLICT_LEGACY_TO_NEW[k];
		if (!alt) {
			alt = `${c}_legacy`;
			let n = 0;
			while (out[alt] !== undefined && out[alt] !== v) {
				n += 1;
				alt = `${c}_legacy_${n}`;
			}
			if (out[alt] === v) {
				repl[k] = alt;
				continue;
			}
		} else if (out[alt] !== undefined && out[alt] !== v) {
			throw new Error(
				`Conflict alias collision: "${alt}" for key "${k}"`,
			);
		}
		out[alt] = v;
		repl[k] = alt;
	}

	const sortedOut = /** @type {Record<string, string>} */ ({});
	for (const k of Object.keys(out).sort()) {
		sortedOut[k] = out[k];
	}
	return { out: sortedOut, repl };
}

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

function applyReplacementsToSource(repl) {
	const pairs = Object.entries(repl).sort((a, b) => b[0].length - a[0].length);
	const srcRoot = path.join(webRoot, "src");
	const files = walkSrcFiles(srcRoot);
	let total = 0;
	for (const file of files) {
		let s = fs.readFileSync(file, "utf8");
		const orig = s;
		for (const [oldKey, newKey] of pairs) {
			if (oldKey === newKey) {
				continue;
			}
			// 1: Destructured hook — const { t } = useTranslation(...); t("key")
			//    (also covers plain t() from any alias named t)
			// 2–3: Chained .t() on hook return (next-intl useTranslations vs react-i18next useTranslation)
			// 4: Client i18n instance — i18n.t("key")
			const patterns = [
				new RegExp(`(\\bt\\s*\\(\\s*)(["'])${escapeRegExp(oldKey)}\\2`, "g"),
				new RegExp(
					`(\\buseTranslations\\([^)]*\\)\\.t\\s*\\(\\s*)(["'])${escapeRegExp(oldKey)}\\2`,
					"g",
				),
				new RegExp(
					`(\\buseTranslation\\([^)]*\\)\\.t\\s*\\(\\s*)(["'])${escapeRegExp(oldKey)}\\2`,
					"g",
				),
				new RegExp(`(\\bi18n\\.t\\s*\\(\\s*)(["'])${escapeRegExp(oldKey)}\\2`, "g"),
			];
			for (const re of patterns) {
				s = s.replace(re, `$1$2${newKey}$2`);
			}
		}
		if (s !== orig) {
			fs.writeFileSync(file, s);
			total++;
		}
	}
	return total;
}

function escapeRegExp(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function main() {
	const locales = ["tw", "en", "jp"];
	const mergedRepl = /** @type {Record<string, string>} */ ({});

	for (const loc of locales) {
		const fp = path.join(localesDir, loc, "translation.json");
		const raw = JSON.parse(fs.readFileSync(fp, "utf8"));
		const { out, repl } = normalizeJson(raw);
		fs.writeFileSync(fp, `${JSON.stringify(out, null, 2)}\n`);
		for (const [oldK, newK] of Object.entries(repl)) {
			if (mergedRepl[oldK] === undefined) {
				mergedRepl[oldK] = newK;
			} else if (mergedRepl[oldK] !== newK) {
				throw new Error(
					`Key rename mismatch for "${oldK}": ${mergedRepl[oldK]} vs ${newK} (${loc})`,
				);
			}
		}
	}

	const replPath = path.join(webRoot, "bin/normalize-translation-keys.repl.json");
	fs.writeFileSync(replPath, `${JSON.stringify(mergedRepl, null, 2)}\n`);

	const touched = applyReplacementsToSource(mergedRepl);
	// eslint-disable-next-line no-console
	console.log(
		`Normalized ${locales.join(", ")} translation.json; wrote ${Object.keys(mergedRepl).length} key renames; touched ${touched} source files.`,
	);
}

main();
