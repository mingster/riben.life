"use client";

import { useEffect, useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";

declare global {
	interface Window {
		gtag: (...args: any[]) => void;
	}
}

/**
 * Test component to verify Google Analytics is working correctly
 * Remove this component in production
 */
export function GATest() {
	const [gaStatus, setGaStatus] = useState<{
		dataLayer: boolean;
		gtag: boolean;
	}>({
		dataLayer: false,
		gtag: false,
	});

	useEffect(() => {
		const checkGAStatus = () => {
			const dataLayer =
				typeof window !== "undefined" && Array.isArray(window.dataLayer);
			const gtag =
				typeof window !== "undefined" && typeof window.gtag === "function";

			setGaStatus({ dataLayer, gtag });
		};

		// Check immediately
		checkGAStatus();

		// Check again after a delay to allow GA to load
		const timer = setTimeout(checkGAStatus, 2000);

		return () => clearTimeout(timer);
	}, []);

	const testEvent = () => {
		if (process.env.NODE_ENV === "production") {
			sendGAEvent({
				event: "ga_test",
				test_parameter: "test_value",
				timestamp: new Date().toISOString(),
			});
		} else {
			console.log("GA Test Event (dev mode, not sent to GA)");
		}
	};

	const testPageView = () => {
		if (process.env.NODE_ENV === "production") {
			sendGAEvent({
				event: "page_view",
				page_title: document.title,
				page_location: window.location.href,
			});
		} else {
			console.log("GA Test Page View (dev mode, not sent to GA)");
		}
	};

	return (
		<div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
			<h3 className="text-lg font-semibold mb-4">
				Google Analytics Status Check
			</h3>

			<div className="space-y-2 mb-4">
				<div className="flex items-center gap-2">
					<span
						className={`w-3 h-3 rounded-full ${gaStatus.dataLayer ? "bg-green-500" : "bg-red-500"}`}
					/>
					<span>Data Layer: {gaStatus.dataLayer ? "✅" : "❌"}</span>
				</div>

				<div className="flex items-center gap-2">
					<span
						className={`w-3 h-3 rounded-full ${gaStatus.gtag ? "bg-green-500" : "bg-red-500"}`}
					/>
					<span>GTAG Function: {gaStatus.gtag ? "✅" : "❌"}</span>
				</div>
			</div>

			<div className="space-y-2">
				<button
					onClick={testEvent}
					className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
				>
					Test Event
				</button>

				<button
					onClick={testPageView}
					className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 ml-2"
				>
					Test Page View
				</button>
			</div>

			<div className="mt-4 text-sm text-gray-600">
				<p>
					Environment Variable:{" "}
					{process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "Not set"}
				</p>
				<p>Check browser console and Google Analytics for events.</p>
			</div>
		</div>
	);
}
