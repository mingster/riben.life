"use client";

import liff from "@line/liff";
import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";

import clientLogger from "@/lib/client-logger";

export interface LiffProfileSnapshot {
	lineUserId: string | null;
	displayName: string | null;
	pictureUrl: string | null;
}

export interface LiffContextValue {
	ready: boolean;
	error: string | null;
	isInClient: boolean;
	isLoggedIn: boolean;
	idToken: string | null;
	/** LINE channel access token (required with ID token for Better Auth LINE sign-in). */
	accessToken: string | null;
	profile: LiffProfileSnapshot | null;
}

const LiffContext = createContext<LiffContextValue | null>(null);

/** When true: use `withLoginOnExternalBrowser` and, if init still fails, allow `/liff` UI to load without LINE (local debugging). */
const LIFF_DEBUG =
	process.env.NEXT_PUBLIC_LIFF_DEBUG === "true" ||
	process.env.NEXT_PUBLIC_LIFF_DEBUG === "1";
const LIFF_ENDPOINT_URL =
	process.env.NEXT_PUBLIC_LIFF_ENDPOINT_URL?.trim() ?? "";
const LIFF_FORCE_INIT_ON_LOCALHOST =
	process.env.NEXT_PUBLIC_LIFF_FORCE_INIT_ON_LOCALHOST === "true" ||
	process.env.NEXT_PUBLIC_LIFF_FORCE_INIT_ON_LOCALHOST === "1";

const liffInitPromises = new Map<string, Promise<void>>();

function getLiffInitPromise(liffId: string): Promise<void> {
	const existing = liffInitPromises.get(liffId);
	if (existing) {
		return existing;
	}
	const promise = (async () => {
		try {
			await liff.init({ liffId });
		} catch (firstErr) {
			if (!LIFF_DEBUG) {
				throw firstErr;
			}
			const firstMessage =
				firstErr instanceof Error ? firstErr.message : String(firstErr);
			clientLogger.warn(
				"LIFF init without withLoginOnExternalBrowser failed; retrying (debug)",
				{
					tags: ["liff", "init", "debug"],
					metadata: { error: firstMessage },
				},
			);
			await liff.init({ liffId, withLoginOnExternalBrowser: true });
		}
	})();
	liffInitPromises.set(liffId, promise);
	return promise.catch((err: unknown) => {
		liffInitPromises.delete(liffId);
		throw err;
	});
}

function readIdToken(): string | null {
	try {
		if (!liff.isLoggedIn()) {
			return null;
		}
		return liff.getIDToken() ?? null;
	} catch (err: unknown) {
		clientLogger.warn("LIFF getIDToken failed", {
			tags: ["liff", "token"],
			metadata: {
				error: err instanceof Error ? err.message : String(err),
			},
		});
		return null;
	}
}

function readAccessToken(): string | null {
	try {
		if (!liff.isLoggedIn()) {
			return null;
		}
		return liff.getAccessToken() ?? null;
	} catch (err: unknown) {
		clientLogger.warn("LIFF getAccessToken failed", {
			tags: ["liff", "token"],
			metadata: {
				error: err instanceof Error ? err.message : String(err),
			},
		});
		return null;
	}
}

function profileFromDecodedIdToken(): LiffProfileSnapshot | null {
	try {
		const decoded = liff.getDecodedIDToken();
		if (!decoded?.sub) {
			return null;
		}
		return {
			lineUserId: decoded.sub,
			displayName: decoded.name ?? null,
			pictureUrl: decoded.picture ?? null,
		};
	} catch (err: unknown) {
		clientLogger.warn("LIFF getDecodedIDToken failed", {
			tags: ["liff", "profile", "token"],
			metadata: {
				error: err instanceof Error ? err.message : String(err),
			},
		});
		return null;
	}
}

function shouldBypassLiffInitInLocalDebug(): boolean {
	if (!LIFF_DEBUG || LIFF_FORCE_INIT_ON_LOCALHOST) {
		return false;
	}
	if (typeof window === "undefined") {
		return false;
	}

	const { hostname, href } = window.location;
	const isLocalHost =
		hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

	if (!isLocalHost) {
		return false;
	}

	// If endpoint is configured and current URL is outside endpoint subtree,
	// skip LIFF init/login in local debug to avoid LINE OAuth invalid redirect.
	if (LIFF_ENDPOINT_URL) {
		return !href.startsWith(LIFF_ENDPOINT_URL);
	}

	// Safe default for localhost debug when endpoint metadata is unknown.
	return true;
}

function getEndpointMismatchMessage(currentUrl: string): string | null {
	if (!LIFF_ENDPOINT_URL) {
		return null;
	}
	if (currentUrl.startsWith(LIFF_ENDPOINT_URL)) {
		return null;
	}
	return `LIFF endpoint mismatch: current URL (${currentUrl}) is not under endpoint (${LIFF_ENDPOINT_URL})`;
}

/**
 * Initializes LINE LIFF once per LIFF app id and exposes runtime state to descendants.
 * Mount only under `/liff` routes so normal storefront traffic does not call `liff.init`.
 *
 * **Debug:** Set `NEXT_PUBLIC_LIFF_DEBUG=true` to allow opening `/liff` in a normal browser:
 * enables `withLoginOnExternalBrowser` on init, and if init still fails, continues with empty LIFF state so pages load.
 */
export function LiffProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<LiffContextValue>({
		ready: false,
		error: null,
		isInClient: false,
		isLoggedIn: false,
		idToken: null,
		accessToken: null,
		profile: null,
	});

	useEffect(() => {
		if (shouldBypassLiffInitInLocalDebug()) {
			clientLogger.warn(
				"Bypassing LIFF init on localhost (debug mode) to avoid endpoint mismatch/login redirect errors",
				{
					tags: ["liff", "init", "debug"],
					metadata: {
						location:
							typeof window !== "undefined" ? window.location.href : "unknown",
						endpointUrl: LIFF_ENDPOINT_URL || null,
					},
				},
			);
			setState({
				ready: true,
				error: null,
				isInClient: false,
				isLoggedIn: false,
				idToken: null,
				accessToken: null,
				profile: null,
			});
			return;
		}

		const liffId = process.env.NEXT_PUBLIC_LIFF_ID?.trim();
		if (!liffId) {
			const message = "NEXT_PUBLIC_LIFF_ID is not set";
			clientLogger.error(message, {
				tags: ["liff", "config"],
				metadata: { phase: "init" },
			});
			setState({
				ready: true,
				error: message,
				isInClient: false,
				isLoggedIn: false,
				idToken: null,
				accessToken: null,
				profile: null,
			});
			return;
		}

		let cancelled = false;

		void (async () => {
			try {
				const currentUrl =
					typeof window !== "undefined" ? window.location.href : "";
				const endpointMismatchMessage = getEndpointMismatchMessage(currentUrl);
				if (endpointMismatchMessage && !LIFF_DEBUG) {
					clientLogger.error(endpointMismatchMessage, {
						tags: ["liff", "init", "config"],
						metadata: {
							location: currentUrl,
							endpointUrl: LIFF_ENDPOINT_URL,
						},
					});
					if (!cancelled) {
						setState({
							ready: true,
							error: endpointMismatchMessage,
							isInClient: false,
							isLoggedIn: false,
							idToken: null,
							accessToken: null,
							profile: null,
						});
					}
					return;
				}

				await getLiffInitPromise(liffId);
				if (cancelled) {
					return;
				}

				const isInClient = liff.isInClient();
				const isLoggedIn = liff.isLoggedIn();

				if (!isLoggedIn) {
					try {
						if (typeof window !== "undefined") {
							liff.login({ redirectUri: window.location.href });
						}
					} catch (loginErr: unknown) {
						const loginMessage =
							loginErr instanceof Error ? loginErr.message : String(loginErr);
						clientLogger.error("LIFF login failed", {
							tags: ["liff", "login"],
							metadata: { error: loginMessage },
						});
						if (!cancelled) {
							setState({
								ready: true,
								error: loginMessage,
								isInClient,
								isLoggedIn: false,
								idToken: null,
								accessToken: null,
								profile: null,
							});
						}
					}
					return;
				}

				const idToken = readIdToken();
				const accessToken = readAccessToken();
				let profile = profileFromDecodedIdToken();

				if (isLoggedIn && !profile) {
					try {
						const p = await liff.getProfile();
						profile = {
							lineUserId: p.userId ?? null,
							displayName: p.displayName ?? null,
							pictureUrl: p.pictureUrl ?? null,
						};
					} catch (err: unknown) {
						clientLogger.error("LIFF getProfile failed after init", {
							tags: ["liff", "profile"],
							metadata: {
								error: err instanceof Error ? err.message : String(err),
							},
						});
					}
				}

				if (!cancelled) {
					setState({
						ready: true,
						error: null,
						isInClient,
						isLoggedIn,
						idToken,
						accessToken,
						profile,
					});
				}
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : String(err);
				if (LIFF_DEBUG) {
					clientLogger.error(
						"LIFF init failed; continuing without LINE (debug)",
						{
							tags: ["liff", "init", "debug"],
							metadata: { error: message },
						},
					);
					if (!cancelled) {
						setState({
							ready: true,
							error: null,
							isInClient: false,
							isLoggedIn: false,
							idToken: null,
							accessToken: null,
							profile: null,
						});
					}
					return;
				}
				clientLogger.error("LIFF init failed", {
					tags: ["liff", "init"],
					metadata: { error: message },
				});
				if (!cancelled) {
					setState({
						ready: true,
						error: message,
						isInClient: false,
						isLoggedIn: false,
						idToken: null,
						accessToken: null,
						profile: null,
					});
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, []);

	const value = useMemo(() => state, [state]);

	return <LiffContext.Provider value={value}>{children}</LiffContext.Provider>;
}

export function useLiff(): LiffContextValue {
	const ctx = useContext(LiffContext);
	if (!ctx) {
		throw new Error("useLiff must be used within LiffProvider");
	}
	return ctx;
}
