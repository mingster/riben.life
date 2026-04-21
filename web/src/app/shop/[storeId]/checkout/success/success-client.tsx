"use client";

import { useEffect } from "react";
import { useCart } from "@/hooks/use-cart";

export function ClearCartOnSuccess() {
	const { emptyCart } = useCart();

	useEffect(() => {
		emptyCart();
	}, [emptyCart]);

	return null;
}
