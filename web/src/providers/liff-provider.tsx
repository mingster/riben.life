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
	profile: LiffProfileSnapshot | null;
}

const LiffContext = createContext<LiffContextValue | null>(null);

const liffInitPromises = new Map<string, Promise<void>>();

function getLiffInitPromise(liffId: string): Promise<void> {
	const existing = liffInitPromises.get(liffId);
	if (existing) {
		return existing;
	}
	const promise = liff.init({ liffId });
	liffInitPromises.set(liffId, promise);
	return promise
		.then(() => undefined)
		.catch((err: unknown) => {
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
	} catch {
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
	} catch {
		return null;
	}
}

/**
 * Initializes LINE LIFF once per LIFF app id and exposes runtime state to descendants.
 * Mount only under `/liff` routes so normal storefront traffic does not call `liff.init`.
 */
export function LiffProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<LiffContextValue>({
		ready: false,
		error: null,
		isInClient: false,
		isLoggedIn: false,
		idToken: null,
		profile: null,
	});

	useEffect(() => {
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
				profile: null,
			});
			return;
		}

		let cancelled = false;

		void (async () => {
			try {
				await getLiffInitPromise(liffId);
				if (cancelled) {
					return;
				}

				const isInClient = liff.isInClient();
				const isLoggedIn = liff.isLoggedIn();
				const idToken = readIdToken();
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
						clientLogger.warn("LIFF getProfile failed after init", {
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
						profile,
					});
				}
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : String(err);
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
