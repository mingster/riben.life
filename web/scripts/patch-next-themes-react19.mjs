#!/usr/bin/env node
/**
 * Applies the fix from https://github.com/pacocoursey/next-themes/pull/386:
 * ThemeScript returns null on the client so React 19 does not warn about
 * `<script>` in the component tree. The blocking script remains in SSR HTML.
 *
 * Idempotent — safe to run on every install. If next-themes changes layout,
 * this logs a warning and skips.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dist = path.join(root, "node_modules/next-themes/dist");

const PATCH_MARKER = 'if(typeof window!="undefined")return null;let p=JSON.stringify';

const patches = [
	{
		file: "index.js",
		needle:
			"Y=t.memo(({forcedTheme:e,storageKey:s,attribute:n,enableSystem:l,enableColorScheme:o,defaultTheme:d,value:u,themes:h,nonce:m,scriptProps:w})=>{let p=JSON.stringify",
		replacement:
			"Y=t.memo(({forcedTheme:e,storageKey:s,attribute:n,enableSystem:l,enableColorScheme:o,defaultTheme:d,value:u,themes:h,nonce:m,scriptProps:w})=>{if(typeof window!=\"undefined\")return null;let p=JSON.stringify",
	},
	{
		file: "index.mjs",
		needle:
			"_=t.memo(({forcedTheme:e,storageKey:i,attribute:s,enableSystem:u,enableColorScheme:m,defaultTheme:a,value:l,themes:h,nonce:d,scriptProps:w})=>{let p=JSON.stringify",
		replacement:
			"_=t.memo(({forcedTheme:e,storageKey:i,attribute:s,enableSystem:u,enableColorScheme:m,defaultTheme:a,value:l,themes:h,nonce:d,scriptProps:w})=>{if(typeof window!=\"undefined\")return null;let p=JSON.stringify",
	},
];

function main() {
	if (!fs.existsSync(dist)) {
		console.warn("[patch-next-themes-react19] skip: next-themes not installed");
		return;
	}

	for (const { file, needle, replacement } of patches) {
		const fp = path.join(dist, file);
		if (!fs.existsSync(fp)) {
			continue;
		}
		let content = fs.readFileSync(fp, "utf8");
		if (content.includes(PATCH_MARKER)) {
			console.log(`[patch-next-themes-react19] ${file}: already patched`);
			continue;
		}
		if (!content.includes(needle)) {
			console.warn(
				`[patch-next-themes-react19] ${file}: expected bundle fragment not found — skip (next-themes version changed?)`,
			);
			continue;
		}
		content = content.replace(needle, replacement);
		fs.writeFileSync(fp, content);
		console.log(`[patch-next-themes-react19] ${file}: patched`);
	}
}

main();
