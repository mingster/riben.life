"use client";

import { useEffect, useState } from "react";

export function IOSVersionCheck({ children }: { children: React.ReactNode }) {
	const [showIOSWarning, setShowIOSWarning] = useState(false);

	useEffect(() => {
		// Check iOS version on client side
		const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
		if (!isIOS) {
			return;
		}

		const iosVersion = parseInt(
			navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/)?.[1] || "0",
		);

		// Minimum iOS version: 13 (Safari 13)
		// iOS 13 was released in 2019 and supports modern web features
		// React 19 and Next.js 16 should work on iOS 13+ with proper transpilation
		const MIN_IOS_VERSION = 13;

		if (iosVersion < MIN_IOS_VERSION) {
			setShowIOSWarning(true);
		}
	}, []);

	if (showIOSWarning) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background p-4">
				<div className="text-center">
					<h1 className="mb-4 text-xl font-semibold text-foreground">
						Browser Not Supported
					</h1>
					<p className="text-muted-foreground">
						This browser is not supported. Please update your iOS to version 13
						or later.
					</p>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
