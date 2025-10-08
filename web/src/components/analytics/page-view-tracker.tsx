"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { sendGAEvent } from "@next/third-parties/google";

export function PageViewTracker() {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	useEffect(() => {
		if (
			typeof window !== "undefined" &&
			process.env.NODE_ENV === "production"
		) {
			const url = `${window.location.origin}${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
			const title = document.title;

			// Track page view using Next.js third-parties (production only)
			sendGAEvent({
				event: "page_view",
				page_title: title,
				page_location: url,
				page_path: pathname,
			});
		}
	}, [pathname, searchParams]);

	return null; // This component doesn't render anything
}
