"use client";

import liff from "@line/liff";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader } from "@/components/loader";
import LineLoginButton from "@/components/auth/button-line-login";
import { authClient } from "@/lib/auth-client";
import { useLiff } from "@/providers/liff-provider";
import { LiffPhase0Status } from "./liff-phase0-status";

const LIFF_DEBUG =
	process.env.NEXT_PUBLIC_LIFF_DEBUG === "true" ||
	process.env.NEXT_PUBLIC_LIFF_DEBUG === "1";

/**
 * Enforce LIFF authentication for all `/liff` routes.
 * Children only render after LIFF is ready and user is logged in with LINE.
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
		// Force LINE sign-in when running inside LIFF routes (non-debug mode).
		liff.login({ redirectUri: window.location.href });
	}, [ready, isLoggedIn]);

	if (!ready) {
		return (
			<div className="flex min-h-[40vh] items-center justify-center">
				<Loader />
			</div>
		);
	}

	if (!isLoggedIn) {
		if (LIFF_DEBUG) {
			// In debug mode, allow Better Auth session to pass when LIFF login is unavailable.
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
