/**
 * Shared helpers for sysAdmin JSON import routes (payment/shipping, etc.).
 */

export function stripUtf8Bom(text: string): string {
	return text.replace(/^\uFEFF/, "");
}

/** Avoid `Boolean("false") === true` when JSON uses string booleans. */
export function readBool(value: unknown, defaultValue: boolean): boolean {
	if (value === true || value === false) {
		return value;
	}
	if (typeof value === "string") {
		const v = value.trim().toLowerCase();
		if (v === "true" || v === "1" || v === "yes") {
			return true;
		}
		if (v === "false" || v === "0" || v === "no" || v === "") {
			return false;
		}
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		return value !== 0;
	}
	return defaultValue;
}

/** First matching key with a finite numeric value; else `fallback`. */
export function readFiniteNumber(
	row: Record<string, unknown>,
	keys: string[],
	fallback: number,
): number {
	for (const key of keys) {
		const raw = row[key];
		if (raw === undefined || raw === null) {
			continue;
		}
		const n = typeof raw === "number" ? raw : Number(raw);
		if (Number.isFinite(n)) {
			return n;
		}
	}
	return fallback;
}

export function readIntTrunc(
	row: Record<string, unknown>,
	keys: string[],
	fallback: number,
): number {
	const n = readFiniteNumber(row, keys, Number.NaN);
	if (Number.isFinite(n)) {
		return Math.trunc(n);
	}
	return fallback;
}
