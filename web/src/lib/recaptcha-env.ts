/**
 * When `true`, the app skips loading Google reCAPTCHA and may bypass token checks
 * on the server. Used under `next dev` to avoid gstatic timeouts and dev friction.
 * Production builds always use `NODE_ENV === "production"` and enforce verification.
 */
export function isRecaptchaDisabledInDevelopment(): boolean {
	return process.env.NODE_ENV === "development";
}

/** Token sent from the client when reCAPTCHA is bypassed in development only. */
export const DEV_RECAPTCHA_BYPASS_TOKEN = "dev-recaptcha-bypass";
