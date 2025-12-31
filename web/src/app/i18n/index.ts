import { createInstance, type FlatNamespace, type KeyPrefix } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from "i18next-resources-to-backend";
import type { FallbackNs } from "react-i18next";
import { initReactI18next } from "react-i18next/initReactI18next";
import { cookieName, fallbackLng, getOptions } from "./settings";

// ANCHOR https://phrase.com/blog/posts/localizing-react-apps-with-i18next/
// ANCHOR https://locize.com/blog/next-app-dir-i18n/
// ANCHOR https://github.com/i18next/next-app-dir-i18next-example-ts
const initI18next = async (ns: string | string[], lng?: string) => {
	// on server side we create a new instance for each render, because during compilation everything seems to be executed in parallel
	const i18nInstance = createInstance();

	await i18nInstance
		.use(LanguageDetector) // Use the language detector
		.use(initReactI18next) // Pass i18n down to react-i18next
		.use(
			resourcesToBackend(
				(language: string, namespace: string) =>
					import(`./locales/${language}/${namespace}.json`),
			),
		)
		.init(getOptions(ns));

	return i18nInstance;
};

export async function getT<
	Ns extends FlatNamespace,
	KPrefix extends KeyPrefix<FallbackNs<Ns>> = undefined,
>(lng?: string, ns?: Ns, options: { keyPrefix?: KPrefix } = {}) {
	const i18nextInstance = await initI18next(
		Array.isArray(ns) ? (ns as string[]) : (ns as string),
	);

	let useThisLng = lng;

	// lng > cookieLng > activeLng > fallbackLng
	if (!useThisLng) {
		// check cookie
		//determine i18n languageId
		// Import cookies dynamically to avoid issues when this file is imported in client components
		const { cookies: getCookies } = await import("next/headers");
		const cookieStore = await getCookies();
		const cookieLng = cookieStore.get(cookieName)?.value || fallbackLng;
		//console.log("cookieLng", cookieLng);

		if (cookieLng) {
			useThisLng = cookieLng;
		}
	}

	if (!useThisLng) {
		//check activeLng
		const activeLng = i18nextInstance.resolvedLanguage;
		//console.log("activeLng", activeLng);

		if (activeLng) {
			useThisLng = activeLng;
		}
	}

	if (!useThisLng) {
		//use fallbackLng as last resort
		useThisLng = fallbackLng;
	}

	if (useThisLng) {
		i18nextInstance.changeLanguage(useThisLng);
	}

	return {
		t: i18nextInstance.getFixedT(useThisLng, ns, options.keyPrefix),
		i18n: i18nextInstance,
		lng: useThisLng,
	};
}
