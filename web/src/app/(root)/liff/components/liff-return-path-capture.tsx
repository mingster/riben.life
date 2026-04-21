"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

import { saveLiffReturnPathIfDeepLink } from "@/lib/liff-return-path";

/**
 * Runs before LIFF init so `/liff/[storeId]` is stored before LINE Login redirects to `/liff`.
 */
export function LiffReturnPathCapture() {
	const pathname = usePathname();

	useLayoutEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		saveLiffReturnPathIfDeepLink(pathname, window.location.search);
	}, [pathname]);

	return null;
}
