"use client";

import {
	GoogleReCaptchaProvider,
	GoogleReCaptcha,
	useGoogleReCaptcha,
} from "@wojtekmaj/react-recaptcha-v3";
import { type ReactNode, useEffect, useState } from "react";

import { useIsHydrated } from "@/hooks/use-hydrated";
import { useTheme } from "@/hooks/use-theme";
import { useLang } from "@/hooks/use-lang";

export function RecaptchaV3({
	children,
	useEnterprise = false,
}: {
	children: ReactNode;
	actionName?: string;
	useEnterprise?: boolean;
}) {
	const isHydrated = useIsHydrated();
	const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA as string;
	const [token, setToken] = useState("");

	// Check if site key is configured
	if (!siteKey) {
		// If no site key, render children without reCAPTCHA
		console.warn("reCAPTCHA disabled: site key not configured");
		return <>{children}</>;
	}

	return (
		<GoogleReCaptchaProvider
			reCaptchaKey={siteKey}
			useEnterprise={useEnterprise}
			useRecaptchaNet={false}
		>
			{isHydrated && (
				<style>{`
                    .grecaptcha-badge {
                        visibility: hidden;
                        border-radius: var(--radius) !important;
                        --tw-shadow: 0 1px 2px 0 var(--tw-shadow-color, #0000000d);
                        box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow) !important;
                        border-style: var(--tw-border-style) !important;
                        border-width: 1px;
                    }

                    .dark .grecaptcha-badge {
                        border-color: var(--input) !important;
                    }
                `}</style>
			)}
			<RecaptchaV3Style />
			{children}
			<GoogleReCaptcha
				onVerify={(token) => {
					if (token) {
						setToken(token);
					} else {
						console.warn("reCAPTCHA returned empty token");
					}
				}}
			/>
		</GoogleReCaptchaProvider>
	);
}

function RecaptchaV3Style() {
	const { executeRecaptcha } = useGoogleReCaptcha();
	const { theme } = useTheme();
	const { lang } = useLang();

	useEffect(() => {
		// Monitor script loading with timeout - only show error if script fails to load after delay
		if (typeof window === "undefined") return;

		// Wait for script to load - provider loads it asynchronously
		const timeout = setTimeout(() => {
			const grecaptcha = (window as any).grecaptcha;
			if (!executeRecaptcha && !grecaptcha) {
				console.error(
					"reCAPTCHA script failed to load after 15 seconds. Possible causes:\n" +
						"1. Network connectivity issues\n" +
						"2. Ad blocker blocking reCAPTCHA\n" +
						"3. Invalid or missing site key (NEXT_PUBLIC_RECAPTCHA)\n" +
						"4. CORS or CSP restrictions\n" +
						"5. Site key needs verification in Google Console",
				);
			} else if (grecaptcha && !grecaptcha.enterprise && !grecaptcha.execute) {
				console.warn(
					"reCAPTCHA loaded but execute method not available. Check if Enterprise mode is correctly configured.",
				);
			}
		}, 15000);

		return () => clearTimeout(timeout);
	}, [executeRecaptcha]);

	useEffect(() => {
		if (!executeRecaptcha) return;

		const updateRecaptcha = async () => {
			// find iframe with title "reCAPTCHA"
			const iframe = document.querySelector(
				"iframe[title='reCAPTCHA']",
			) as HTMLIFrameElement;
			if (iframe) {
				try {
					const iframeSrcUrl = new URL(iframe.src);
					iframeSrcUrl.searchParams.set("theme", theme);
					if (lang) iframeSrcUrl.searchParams.set("hl", lang);
					iframe.src = iframeSrcUrl.toString();
				} catch (error) {
					console.warn("Failed to update reCAPTCHA iframe:", error);
				}
			}
		};

		updateRecaptcha();
	}, [executeRecaptcha, theme, lang]);

	return null;
}
