"use client";

import { useCallback, useMemo, useState } from "react";

const STORAGE_KEY = "riben.life_saved_designs_v1";

export interface SavedDesignEntry {
	id: string;
	productId: string;
	productName: string;
	customizationJson: string;
	savedAt: number;
}

function readRaw(): SavedDesignEntry[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(x): x is SavedDesignEntry =>
				typeof x === "object" &&
				x !== null &&
				typeof (x as SavedDesignEntry).id === "string" &&
				typeof (x as SavedDesignEntry).productId === "string" &&
				typeof (x as SavedDesignEntry).customizationJson === "string" &&
				typeof (x as SavedDesignEntry).savedAt === "number",
		);
	} catch {
		return [];
	}
}

function writeRaw(entries: SavedDesignEntry[]): void {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function listSavedDesigns(): SavedDesignEntry[] {
	return readRaw().sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Keep the newest saved design per product (e.g. after sign-in / device sync).
 */
export function dedupeSavedDesignsByProduct(): void {
	const all = readRaw();
	const byProduct = new Map<string, SavedDesignEntry>();
	for (const e of all.sort((a, b) => b.savedAt - a.savedAt)) {
		if (!byProduct.has(e.productId)) {
			byProduct.set(e.productId, e);
		}
	}
	writeRaw([...byProduct.values()].sort((a, b) => b.savedAt - a.savedAt));
}

export function saveDesignToLocalStorage(input: {
	productId: string;
	productName: string;
	customizationJson: string;
}): SavedDesignEntry {
	const entry: SavedDesignEntry = {
		id:
			typeof crypto !== "undefined" && "randomUUID" in crypto
				? crypto.randomUUID()
				: `d_${Date.now()}`,
		productId: input.productId,
		productName: input.productName,
		customizationJson: input.customizationJson,
		savedAt: Date.now(),
	};
	const next = [
		entry,
		...readRaw().filter((e) => e.productId !== input.productId),
	];
	writeRaw(next);
	return entry;
}

export function removeSavedDesign(id: string): void {
	writeRaw(readRaw().filter((e) => e.id !== id));
}

/** Remove any local entry for this product (e.g. after cloud save to avoid divergence). */
export function removeSavedDesignByProductId(productId: string): void {
	writeRaw(readRaw().filter((e) => e.productId !== productId));
}

export function useSavedDesigns() {
	const [version, setVersion] = useState(0);

	const items = useMemo(() => {
		void version;
		return listSavedDesigns();
	}, [version]);

	const refresh = useCallback(() => {
		setVersion((v) => v + 1);
	}, []);

	const save = useCallback(
		(input: {
			productId: string;
			productName: string;
			customizationJson: string;
		}) => {
			saveDesignToLocalStorage(input);
			refresh();
		},
		[refresh],
	);

	const remove = useCallback(
		(id: string) => {
			removeSavedDesign(id);
			refresh();
		},
		[refresh],
	);

	return { items, save, remove, refresh };
}
