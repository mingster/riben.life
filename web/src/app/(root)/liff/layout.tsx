import type { Metadata } from "next";

import { LiffPostLoginRedirect } from "@/app/(root)/liff/components/liff-post-login-redirect";
import { LiffRequireLineSignIn } from "@/app/(root)/liff/components/liff-require-line-sign-in";
import { LiffReturnPathCapture } from "@/app/(root)/liff/components/liff-return-path-capture";
import { LiffProvider } from "@/providers/liff-provider";
import { CookiesProvider } from "next-client-cookies/server";

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
			<CookiesProvider>
				<LiffReturnPathCapture />
				<LiffProvider>
					<LiffPostLoginRedirect />
					<LiffRequireLineSignIn>{children}</LiffRequireLineSignIn>
				</LiffProvider>
			</CookiesProvider>
		</div>
	);
}
