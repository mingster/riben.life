import type { Metadata } from "next";

import { LiffProvider } from "@/providers/liff-provider";

export const metadata: Metadata = {
	title: "LINE",
	description: "riben.life via LINE LIFF",
};

/**
 * All customer-facing LIFF routes mount under `/liff`. The provider runs `liff.init` once
 * per session (see `LiffProvider`).
 */
export default function LiffRootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-dvh bg-background px-3 py-4 sm:px-4">
			<LiffProvider>{children}</LiffProvider>
		</div>
	);
}
