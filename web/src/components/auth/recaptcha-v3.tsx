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
}: {
	children: ReactNode;
	actionName?: string;
}) {
	const isHydrated = useIsHydrated();
	const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA as string;
	const [token, setToken] = useState("");

	return (
		<GoogleReCaptchaProvider
			reCaptchaKey={siteKey}
			useEnterprise={false}
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
			<GoogleReCaptcha onVerify={setToken} />
		</GoogleReCaptchaProvider>
	);
}

function RecaptchaV3Style() {
	const { executeRecaptcha } = useGoogleReCaptcha();
	const { theme } = useTheme();
	const { lang } = useLang();

	useEffect(() => {
		if (!executeRecaptcha) return;

		const updateRecaptcha = async () => {
			// find iframe with title "reCAPTCHA"
			const iframe = document.querySelector(
				"iframe[title='reCAPTCHA']",
			) as HTMLIFrameElement;
			if (iframe) {
				const iframeSrcUrl = new URL(iframe.src);
				iframeSrcUrl.searchParams.set("theme", theme);
				if (lang) iframeSrcUrl.searchParams.set("hl", lang);
				iframe.src = iframeSrcUrl.toString();
			}
		};

		updateRecaptcha();
	}, [executeRecaptcha, theme, lang]);

	return null;
}
