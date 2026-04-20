"use client";

import { useEffect } from "react";
import { useCart } from "@/hooks/use-cart";

/** Ensures cart checkout can resolve `storeId` outside `/shop` dynamic routes. */
export function ShopCartMetadata({ storeId }: { storeId: string }) {
	const { updateCartMetadata, metadata } = useCart();

	useEffect(() => {
		if (metadata?.storeId === storeId) return;
		updateCartMetadata({ storeId });
	}, [storeId, metadata?.storeId, updateCartMetadata]);

	return null;
}
