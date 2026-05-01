"use client";

import liff from "@line/liff";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import LineLoginButton from "@/components/auth/button-line-login";
import { Loader } from "@/components/loader";
import clientLogger from "@/lib/client-logger";
import { authClient } from "@/lib/auth-client";
import { useLiff } from "@/providers/liff-provider";

import { LiffPhase0Status } from "./liff-phase0-status";

const LIFF_DEBUG =
	process.env.NEXT_PUBLIC_LIFF_DEBUG === "true" ||
	process.env.NEXT_PUBLIC_LIFF_DEBUG === "1";

/**
 * LIFF routes: render children only after LIFF is ready and LINE login is satisfied (unless debug).
 */
export function LiffRequireLineSignIn({
	children,
}: {
	children: React.ReactNode;
}) {
	const { ready, isLoggedIn } = useLiff();
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const loginRequestedRef = useRef(false);
	const callbackUrl = searchParams?.toString()
		? `${pathname}?${searchParams.toString()}`
		: pathname;

	useEffect(() => {
		if (!ready || isLoggedIn || LIFF_DEBUG || loginRequestedRef.current) {
			return;
		}

		loginRequestedRef.current = true;
		try {
			liff.login({ redirectUri: window.location.href });
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			clientLogger.error(
				"LIFF login redirect failed (liff-require-line-sign-in)",
				{
					tags: ["liff", "login"],
					metadata: {
						error: message,
						pathname,
					},
				},
			);
		}
	}, [ready, isLoggedIn, pathname]);

	if (!ready) {
		return (
			<div className="flex min-h-[40vh] items-center justify-center">
				<Loader />
			</div>
		);
	}

	if (!isLoggedIn) {
		if (LIFF_DEBUG) {
			if (isSessionPending) {
				return (
					<div className="flex min-h-[40vh] items-center justify-center">
						<Loader />
					</div>
				);
			}

			if (session) {
				return <>{children}</>;
			}

			return (
				<div className="mx-auto flex min-h-[40vh] w-full max-w-md flex-col justify-center gap-4">
					<LineLoginButton callbackUrl={callbackUrl} />
					<LiffPhase0Status />
				</div>
			);
		}

		return (
			<div className="flex min-h-[40vh] items-center justify-center">
				<Loader />
			</div>
		);
	}

	return <>{children}</>;
}
