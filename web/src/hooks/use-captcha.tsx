"use client";

import { AuthUIContext } from "@daveyplate/better-auth-ui";
import { useGoogleReCaptcha } from "@wojtekmaj/react-recaptcha-v3";
import type ReCAPTCHA from "react-google-recaptcha";
import { type RefObject, useContext, useRef } from "react";
import logger from "@/lib/logger";

// Default captcha endpoints
const DEFAULT_CAPTCHA_ENDPOINTS = [
	"/sign-up/email",
	"/sign-in/email",
	"/forget-password",
];

// Sanitize action name for reCAPTCHA
// Google reCAPTCHA only allows A-Za-z/_ in action names
const sanitizeActionName = (action: string): string => {
	// First remove leading slash if present
	let result = action.startsWith("/") ? action.substring(1) : action;

	// Convert both kebab-case and path separators to camelCase
	// Example: "/sign-in/email" becomes "signInEmail"
	result = result
		.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
		.replace(/\/([a-z])/g, (_, letter) => letter.toUpperCase())
		.replace(/\//g, "")
		.replace(/[^A-Za-z0-9_]/g, "");

	return result;
};

export function useCaptcha() {
	const { captcha } = useContext(AuthUIContext);

	const captchaRef = useRef<any>(null);
	const { executeRecaptcha } = useGoogleReCaptcha();

	const executeCaptcha = async (action: string) => {
		if (!captcha) {
			logger.error("Captcha context not available in executeCaptcha", {
				tags: ["error"],
			});
			throw new Error("MISSING_RESPONSE");
		}

		console.log(
			"Executing captcha for action:",
			action,
			"Provider:",
			captcha.provider,
		);

		// Sanitize the action name for reCAPTCHA
		let response: string | undefined | null;

		switch (captcha.provider) {
			case "google-recaptcha-v3": {
				const sanitizedAction = sanitizeActionName(action);
				logger.info("Sanitized action", {
					metadata: { action: sanitizedAction },
					tags: ["captcha", "recaptcha"],
				});

				if (!executeRecaptcha) {
					// Check if grecaptcha is available as fallback
					const grecaptcha = (window as any).grecaptcha;
					if (!grecaptcha) {
						throw new Error(
							"reCAPTCHA not ready - script may be blocked or failed to load",
						);
					}
					throw new Error("reCAPTCHA not ready");
				}

				// Add timeout to prevent infinite loading
				// Also catch Google's internal timeout errors
				try {
					// Verify grecaptcha is available before executing
					const grecaptcha = (window as any).grecaptcha;
					if (grecaptcha) {
						// Check if enterprise API is available (for Enterprise mode)
						const hasEnterprise =
							grecaptcha.enterprise && grecaptcha.enterprise.execute;
						const hasStandard = grecaptcha.execute;

						if (!hasEnterprise && !hasStandard) {
							throw new Error(
								"reCAPTCHA API not available - script may not be fully loaded",
							);
						}
					}

					const tokenPromise = executeRecaptcha(sanitizedAction);
					const timeoutPromise = new Promise<never>((_, reject) =>
						setTimeout(() => reject(new Error("reCAPTCHA timeout")), 10000),
					);
					response = await Promise.race([tokenPromise, timeoutPromise]);
					logger.info("reCAPTCHA response received");
				} catch (error) {
					// Handle Google's internal timeout errors
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					const isTimeoutError =
						errorMessage.includes("timeout") ||
						errorMessage.includes("Timeout") ||
						errorMessage === "Timeout (b)";

					logger.error("reCAPTCHA execution failed", {
						metadata: {
							error: errorMessage,
							action: sanitizedAction,
							isTimeout: isTimeoutError,
						},
						tags: ["captcha", "error"],
					});

					// Provide more helpful error message for timeout
					if (isTimeoutError) {
						throw new Error(
							"reCAPTCHA timeout - The verification service is taking too long. " +
								"This may be due to network issues, ad blockers, or the reCAPTCHA service being unavailable. " +
								"Please try again or check your network connection.",
						);
					}

					throw error;
				}
				break;
			}
			/*
            case "google-recaptcha-v2-checkbox": {
                const recaptchaRef = captchaRef as RefObject<ReCAPTCHA>
                response = recaptchaRef.current.getValue()
                break
            }
            case "google-recaptcha-v2-invisible": {
                const recaptchaRef = captchaRef as RefObject<ReCAPTCHA>
                response = await recaptchaRef.current.executeAsync()
                break
            }
            case "cloudflare-turnstile": {
                const turnstileRef = captchaRef as RefObject<TurnstileInstance>
                response = turnstileRef.current.getResponse()
                break
            }
            case "hcaptcha": {
                const hcaptchaRef = captchaRef as RefObject<HCaptcha>
                response = hcaptchaRef.current.getResponse()
                break
            }
			*/
			default: {
				break;
			}
		}

		if (!response) {
			throw new Error("MISSING_RESPONSE");
		}

		return response;
	};

	const getCaptchaHeaders = async (action: string) => {
		if (!captcha) {
			logger.info("Captcha context not available");
			return undefined;
		}

		// Use custom endpoints if provided, otherwise use defaults
		const endpoints = captcha.endpoints || DEFAULT_CAPTCHA_ENDPOINTS;
		logger.info("Captcha endpoints:");

		// Only execute captcha if the action is in the endpoints list
		if (endpoints.includes(action)) {
			try {
				const token = await executeCaptcha(action);
				logger.info("Captcha token generated:");
				return { "x-captcha-response": token };
			} catch (error) {
				logger.error("Captcha execution failed:", {
					metadata: {
						error: error instanceof Error ? error.message : String(error),
					},
					tags: ["error"],
				});
				throw error;
			}
		}

		logger.info("Action not in captcha endpoints, skipping captcha");
		return undefined;
	};

	const resetCaptcha = () => {
		if (!captcha) return;

		switch (captcha.provider) {
			case "google-recaptcha-v3": {
				// No widget to reset; token is generated per execute call
				break;
			}
			default: {
				break;
			}
		}
	};

	return {
		captchaRef,
		getCaptchaHeaders,
		resetCaptcha,
	};
}
