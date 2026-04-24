import Script from "next/script";

import { isRecaptchaDisabledInDevelopment } from "@/lib/recaptcha-env";

import { RecaptchaBadgeStyles } from "./recaptcha-badge-styles";

interface RecaptchaScriptProps {
	useEnterprise?: boolean;
}

/**
 * Loads Google reCAPTCHA from the root layout. Implemented as a server component
 * so `next/script` is not nested under a client boundary (avoids React script-tag warnings).
 */
export function RecaptchaScript({
	useEnterprise = true,
}: RecaptchaScriptProps) {
	const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA;
	const skipLoad = isRecaptchaDisabledInDevelopment();

	if (skipLoad || !siteKey) {
		return null;
	}

	const scriptUrl = useEnterprise
		? `https://www.google.com/recaptcha/enterprise.js?render=${siteKey}`
		: `https://www.google.com/recaptcha/api.js?render=${siteKey}`;

	return (
		<>
			<RecaptchaBadgeStyles />
			<Script
				id="recaptcha-script"
				src={scriptUrl}
				strategy="afterInteractive"
			/>
		</>
	);
}
