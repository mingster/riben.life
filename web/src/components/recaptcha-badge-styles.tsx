"use client";

import { useEffect } from "react";

/** Injects reCAPTCHA badge positioning styles when the script is loaded from the root layout. */
export function RecaptchaBadgeStyles() {
	useEffect(() => {
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

	return null;
}
