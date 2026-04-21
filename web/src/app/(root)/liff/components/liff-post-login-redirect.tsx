"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { consumeLiffReturnPath, isLiffRootPath } from "@/lib/liff-return-path";
import { useLiff } from "@/providers/liff-provider";

/**
 * After LINE Login, OAuth often lands on `/liff` without `/liff/[storeId]`. Restore from sessionStorage.
 */
export function LiffPostLoginRedirect() {
	const pathname = usePathname();
	const router = useRouter();
	const { ready, error, isLoggedIn } = useLiff();
	const didRestore = useRef(false);

	useEffect(() => {
		if (!ready || error || !isLoggedIn || didRestore.current) {
			return;
		}
		if (!isLiffRootPath(pathname)) {
			return;
		}
		const target = consumeLiffReturnPath();
		if (!target) {
			return;
		}
		const targetPath = target.split("?")[0] ?? "";
		if (targetPath === pathname) {
			return;
		}
		didRestore.current = true;
		router.replace(target);
	}, [ready, error, isLoggedIn, pathname, router]);

	return null;
}
