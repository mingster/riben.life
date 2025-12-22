"use client";

import { toastError } from "@/components/toaster";
import { Loader } from "@/components/loader";
import { getHostname } from "@/utils/utils";
import type { Store } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import logger from "@/lib/logger";

export default function GlobalHomePage() {
	const [mounted, setMounted] = useState(false);
	const isRoutingRef = useRef(false);
	const router = useRouter();

	const routeToStore = useCallback(async () => {
		// Prevent multiple simultaneous routing attempts
		if (isRoutingRef.current) return;
		isRoutingRef.current = true;

		try {
			const host = getHostname();

			// If no hostname, redirect to universal page
			if (!host) {
				logger.warn("No hostname found, redirecting to /unv", {
					metadata: { hostname: host },
					tags: ["routing", "hostname"],
				});
				router.push("/unv");
				return;
			}

			const url = `${process.env.NEXT_PUBLIC_API_URL}/store/get-by-hostname`;
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					customDomain: host,
				}),
			});

			// Validate response
			if (!response.ok) {
				throw new Error(
					`Failed to fetch store: ${response.status} ${response.statusText}`,
				);
			}

			const data = await response.json();

			// Validate data structure
			if (!Array.isArray(data)) {
				throw new Error("Invalid response format from API");
			}

			let redirectUrl = "/unv"; // Default path if no store found

			if (data.length > 0) {
				const stores = data as Store[];
				const storeId = stores[0]?.id;

				if (storeId) {
					redirectUrl = `/s/${storeId}`;
				}
			}

			logger.info("Routing to store", {
				metadata: {
					hostname: host,
					storeId: data.length > 0 ? (data as Store[])[0]?.id : null,
					redirectUrl,
				},
				tags: ["routing", "store"],
			});

			router.push(redirectUrl);
		} catch (error) {
			logger.error("Failed to route to store", {
				metadata: {
					error: error instanceof Error ? error.message : String(error),
					hostname: getHostname(),
				},
				tags: ["routing", "error"],
			});

			const errorMessage =
				error instanceof Error ? error.message : "Something went wrong.";
			toastError({
				title: "Routing Error",
				description: errorMessage,
			});

			// Fallback to universal page on error
			router.push("/unv");
		} finally {
			isRoutingRef.current = false;
		}
	}, [router]);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (mounted) {
			routeToStore();
		}
	}, [mounted, routeToStore]);

	// Show nothing until mounted (prevents hydration mismatch)
	if (!mounted) {
		return null;
	}

	// Show loader while routing
	return (
		<div className="flex min-h-screen items-center justify-center">
			<Loader />
		</div>
	);
}
