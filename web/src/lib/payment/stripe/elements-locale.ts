import type { StripeElementLocale } from "@stripe/stripe-js";

/**
 * Map app i18n codes to Stripe.js Elements supported locales.
 * @see https://docs.stripe.com/js/appendix/supported_locales
 */
export function appLngToStripeElementsLocale(lng: string): StripeElementLocale {
	switch (lng) {
		case "tw":
			return "zh-TW";
		case "jp":
			return "ja";
		case "en":
			return "en";
		default:
			return "en";
	}
}
