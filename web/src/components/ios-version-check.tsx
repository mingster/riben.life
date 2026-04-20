"use client";

import { useEffect, useState } from "react";

export function IOSVersionCheck({ children }: { children: React.ReactNode }) {
	const [showIOSWarning, setShowIOSWarning] = useState(false);

	useEffect(() => {
		// Check iOS version on client side
		const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
		const isIOS16 =
			isIOS &&
			parseInt(
				navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/)?.[1] || "0",
			) < 16;

		if (isIOS16) {
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
						This browser is not supported. Please update your iOS to version 16
						or later.
					</p>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
