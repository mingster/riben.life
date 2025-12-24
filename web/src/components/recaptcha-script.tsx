"use client";

import Script from "next/script";
import { useEffect } from "react";

interface RecaptchaScriptProps {
	useEnterprise?: boolean;
}

/**
 * Component to load reCAPTCHA script using Next.js Script component
 * This replaces the provider pattern and works better with Next.js App Router
 */
export function RecaptchaScript({
	useEnterprise = true,
}: RecaptchaScriptProps) {
	const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA;

	useEffect(() => {
		// Inject styles for reCAPTCHA badge
		const style = document.createElement("style");
		style.textContent = `
			.grecaptcha-badge {
				visibility: hidden;
				border-radius: var(--radius) !important;
				--tw-shadow: 0 1px 2px 0 var(--tw-shadow-color, #0000000d);
				box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow),
					var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow) !important;
				border-style: var(--tw-border-style) !important;
				border-width: 1px;
			}

			.dark .grecaptcha-badge {
				border-color: var(--input) !important;
			}
		`;
		document.head.appendChild(style);

		return () => {
			document.head.removeChild(style);
		};
	}, []);

	if (!siteKey) {
		return null;
	}

	// Determine script URL based on Enterprise mode
	const scriptUrl = useEnterprise
		? `https://www.google.com/recaptcha/enterprise.js?render=${siteKey}`
		: `https://www.google.com/recaptcha/api.js?render=${siteKey}`;

	return (
		<Script
			id="recaptcha-script"
			src={scriptUrl}
			strategy="afterInteractive"
			onLoad={() => {
				// Script loaded successfully
				if (typeof window !== "undefined" && window.grecaptcha?.ready) {
					window.grecaptcha.ready(() => {
						// reCAPTCHA is ready
					});
				}
			}}
			onError={() => {
				console.error("Failed to load reCAPTCHA script");
			}}
		/>
	);
}
