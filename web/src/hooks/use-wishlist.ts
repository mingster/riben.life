"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "riben.life_shop_wishlist";

export interface WishlistEntry {
	productId: string;
	name: string;
	imageUrl?: string;
}

export function useWishlist() {
	const [items, setItems] = useState<WishlistEntry[]>([]);

	useEffect(() => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as WishlistEntry[];
				if (Array.isArray(parsed)) setItems(parsed);
			}
		} catch {
			// ignore corrupt storage
		}
	}, []);

	const toggle = useCallback((entry: WishlistEntry) => {
		setItems((prev) => {
			const exists = prev.some((p) => p.productId === entry.productId);
			const next = exists
				? prev.filter((p) => p.productId !== entry.productId)
				: [...prev, entry];
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
			} catch {
				// ignore quota
			}
			return next;
		});
	}, []);

	const isSaved = useCallback(
		(productId: string) => items.some((p) => p.productId === productId),
		[items],
	);

	return { items, toggle, isSaved };
}
