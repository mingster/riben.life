"use client";

import { useCallback, useEffect, useState } from "react";

declare global {
	interface Window {
		grecaptcha?: {
			enterprise?: {
				execute: (
					siteKey: string,
					options: { action: string },
				) => Promise<string>;
			};
			execute: (
				siteKey: string,
				options: { action: string },
			) => Promise<string>;
			ready: (callback: () => void) => void;
		};
	}
}

interface UseRecaptchaResult {
	executeRecaptcha: ((action: string) => Promise<string>) | null;
	isReady: boolean;
	error: string | null;
}

/**
 * Custom hook for reCAPTCHA that works without provider pattern
 * Uses Next.js Script component to load the script and directly calls grecaptcha API
 *
 * @param useEnterprise - Whether to use Enterprise reCAPTCHA (default: true)
 * @returns Object with executeRecaptcha function, isReady state, and error state
 */
export function useRecaptcha(
	useEnterprise: boolean = true,
): UseRecaptchaResult {
	const [isReady, setIsReady] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA;

	// Check if reCAPTCHA is ready
	useEffect(() => {
		if (typeof window === "undefined" || !siteKey) {
			setError("reCAPTCHA site key not configured");
			return;
		}

		const checkRecaptcha = () => {
			const grecaptcha = window.grecaptcha;
			if (!grecaptcha) {
				return false;
			}

			// Check if Enterprise mode is available
			if (useEnterprise) {
				if (
					grecaptcha.enterprise &&
					typeof grecaptcha.enterprise.execute === "function"
				) {
					setIsReady(true);
					setError(null);
					return true;
				} else {
					setError("reCAPTCHA Enterprise not available");
					return false;
				}
			} else {
				if (typeof grecaptcha.execute === "function") {
					setIsReady(true);
					setError(null);
					return true;
				} else {
					setError("reCAPTCHA not available");
					return false;
				}
			}
		};

		// Check immediately if already loaded
		if (checkRecaptcha()) {
			return;
		}

		// Wait for reCAPTCHA to be ready
		if (window.grecaptcha?.ready) {
			window.grecaptcha.ready(() => {
				checkRecaptcha();
			});
		}

		// Fallback: Poll for grecaptcha to be available
		let attempts = 0;
		const maxAttempts = 50; // 5 seconds max wait
		const interval = setInterval(() => {
			attempts++;
			const ready = checkRecaptcha();
			if (ready || attempts >= maxAttempts) {
				clearInterval(interval);
				if (attempts >= maxAttempts && !ready) {
					setError("reCAPTCHA failed to load after 5 seconds");
				}
			}
		}, 100);

		return () => clearInterval(interval);
	}, [siteKey, useEnterprise]);

	const executeRecaptcha = useCallback(
		async (action: string): Promise<string> => {
			if (!siteKey) {
				throw new Error("reCAPTCHA site key not configured");
			}

			if (!isReady) {
				throw new Error("reCAPTCHA is not ready yet");
			}

			const grecaptcha = window.grecaptcha;
			if (!grecaptcha) {
				throw new Error("reCAPTCHA script not loaded");
			}

			try {
				if (useEnterprise) {
					if (
						!grecaptcha.enterprise ||
						typeof grecaptcha.enterprise.execute !== "function"
					) {
						throw new Error("reCAPTCHA Enterprise not available");
					}
					return await grecaptcha.enterprise.execute(siteKey, { action });
				} else {
					if (typeof grecaptcha.execute !== "function") {
						throw new Error("reCAPTCHA not available");
					}
					return await grecaptcha.execute(siteKey, { action });
				}
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "reCAPTCHA execution failed";
				setError(errorMessage);
				throw err;
			}
		},
		[siteKey, useEnterprise, isReady],
	);

	return {
		executeRecaptcha: isReady ? executeRecaptcha : null,
		isReady,
		error,
	};
}
