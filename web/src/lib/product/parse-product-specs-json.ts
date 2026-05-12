import { z } from "zod";

const specsObjectSchema = z.record(z.string(), z.unknown());

/**
 * Parses optional JSON specs from admin text input.
 * - `undefined` / omitted → skip update (caller should not write `specsJson`).
 * - `""` or whitespace → clear to `null`.
 * - Non-empty → must be a JSON object.
 */
export function parseProductSpecsJsonText(
	raw: string | undefined,
): Record<string, unknown> | null | undefined {
	if (raw === undefined) {
		return undefined;
	}
	const t = raw.trim();
	if (t === "") {
		return null;
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(t) as unknown;
	} catch {
		throw new Error("Specs must be valid JSON");
	}
	const obj = specsObjectSchema.safeParse(parsed);
	if (!obj.success) {
		throw new Error("Specs JSON must be an object (key/value), not an array");
	}
	return obj.data;
}
