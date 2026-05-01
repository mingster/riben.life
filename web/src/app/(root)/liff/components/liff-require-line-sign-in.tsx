"use client";

import liff from "@line/liff";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import LineLoginButton from "@/components/auth/button-line-login";
import { Loader } from "@/components/loader";
import clientLogger from "@/lib/client-logger";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/providers/i18n-provider";
import { useLiff } from "@/providers/liff-provider";

import { LiffPhase0Status } from "./liff-phase0-status";

const LIFF_DEBUG =
	process.env.NEXT_PUBLIC_LIFF_DEBUG === "true" ||
	process.env.NEXT_PUBLIC_LIFF_DEBUG === "1";

function formatSocialSignInError(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === "object" && error !== null && "message" in error) {
		return String((error as { message: unknown }).message);
	}
	return String(error);
}

/**
 * LIFF routes: render children only after LIFF is ready and LINE login is satisfied (unless debug),
 * then establish a Better Auth session via LINE ID token when inside LINE / LIFF (no OAuth redirect).
 */
export function LiffRequireLineSignIn({
	children,
}: {
	children: React.ReactNode;
}) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const { ready, isLoggedIn, idToken, accessToken } = useLiff();
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const loginRequestedRef = useRef(false);
	const bridgeAttemptedRef = useRef(false);
	const [bridgeError, setBridgeError] = useState<string | null>(null);

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

	useEffect(() => {
		if (!ready || !isLoggedIn || !idToken || !accessToken) {
			return;
		}
		if (isSessionPending || session) {
			return;
		}
		if (bridgeError !== null) {
			return;
		}
		if (bridgeAttemptedRef.current) {
			return;
		}
		bridgeAttemptedRef.current = true;

		void (async () => {
			try {
				const { error } = await authClient.signIn.social({
					provider: "line",
					idToken: {
						token: idToken,
						accessToken,
					},
				});
				if (error) {
					const message = formatSocialSignInError(error);
					clientLogger.error("LIFF Better Auth LINE id-token sign-in failed", {
						tags: ["liff", "auth", "line"],
						metadata: { message },
					});
					setBridgeError(message || t("liff_line_bridge_failed"));
					bridgeAttemptedRef.current = false;
				}
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : String(err);
				clientLogger.error("LIFF Better Auth LINE id-token exception", {
					tags: ["liff", "auth", "line"],
					metadata: { error: message },
				});
				setBridgeError(message);
				bridgeAttemptedRef.current = false;
			}
		})();
	}, [
		ready,
		isLoggedIn,
		idToken,
		accessToken,
		session,
		isSessionPending,
		bridgeError,
		t,
	]);

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

	if (!idToken || !accessToken) {
		return (
			<div className="mx-auto flex min-h-[40vh] w-full max-w-md flex-col justify-center gap-4 px-2">
				<p className="text-center text-sm text-muted-foreground">
					{t("liff_tokens_missing_descr")}
				</p>
				<LineLoginButton callbackUrl={callbackUrl} />
				<LiffPhase0Status />
			</div>
		);
	}

	if (bridgeError) {
		return (
			<div className="mx-auto flex min-h-[40vh] w-full max-w-md flex-col justify-center gap-4 px-2">
				<p className="text-center text-sm text-destructive">{bridgeError}</p>
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
