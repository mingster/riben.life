"use client";

import i18next, { type FlatNamespace, type KeyPrefix } from "i18next";
// import LocizeBackend from 'i18next-locize-backend'
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from "i18next-resources-to-backend";
import { useCookies } from "next-client-cookies";
import { useEffect, useRef, useState } from "react";

import {
	type FallbackNs,
	type UseTranslationOptions,
	type UseTranslationResponse,
	initReactI18next,
	useTranslation as useTranslationOrg,
} from "react-i18next";
import { cookieName, getOptions, languages } from "./settings";

const runsOnServerSide = typeof window === "undefined";

// on client side the normal singleton is ok
i18next
	.use(LanguageDetector)
	.use(initReactI18next) // passes i18n down to react-i18next
	.use(
		resourcesToBackend(
			(language: string, namespace: string) =>
				import(`./locales/${language}/${namespace}.json`),
		),
	)
	// .use(LocizeBackend) // locize backend could be used on client side, but prefer to keep it in sync with server side
	.init({
		...getOptions(),
		lng: undefined, // let detect the language on client side (prioritize cookie/htmlTag below)
		detection: {
			// Avoid navigator-first to prevent flicker to browser locale (e.g., 'en') during navigation.
			// Prefer persisted cookie and server-rendered <html lang="..."> to keep language stable.
			order: ["cookie", "htmlTag", "path"],
		},
		preload: runsOnServerSide ? languages : [],
	});

export function useTranslation<
	Ns extends FlatNamespace,
	KPrefix extends KeyPrefix<FallbackNs<Ns>> = undefined,
>(
	lng?: string,
	ns?: Ns,
	options?: UseTranslationOptions<KPrefix>,
): UseTranslationResponse<FallbackNs<Ns>, KPrefix> {
	const cookies = useCookies();

	//const [cookies, setCookie] = useCookies([cookieName]);

	const ret = useTranslationOrg(ns, options);
	const { i18n } = ret;

	if (runsOnServerSide && lng && i18n.resolvedLanguage !== lng) {
		i18n.changeLanguage(lng);
	}

	const [activeLng, setActiveLng] = useState(i18n.resolvedLanguage);

	// Sync activeLng with i18n's resolved language
	useEffect(() => {
		if (activeLng === i18n.resolvedLanguage) return;
		setActiveLng(i18n.resolvedLanguage);
	}, [activeLng, i18n.resolvedLanguage]);

	// Only change language if lng is explicitly provided and different
	// Use a ref to track the last lng we processed to avoid conflicts
	const lastLngRef = useRef<string | undefined>(lng);

	useEffect(() => {
		if (!lng) {
			lastLngRef.current = undefined;
			return; // Only change if lng is explicitly provided
		}

		// Skip if we already processed this lng
		if (lastLngRef.current === lng) return;

		// Only change if it's different from current resolved language
		if (i18n.resolvedLanguage !== lng) {
			i18n.changeLanguage(lng);
			lastLngRef.current = lng;
		}
	}, [lng, i18n.resolvedLanguage]); // Include i18n.resolvedLanguage to check current state

	// Set cookie when lng is provided - only run when lng changes
	// Don't include cookies in dependencies to avoid infinite loops
	useEffect(() => {
		if (!lng) return; // Only set cookie if lng is explicitly provided

		const currentCookie = cookies.get(cookieName);
		if (currentCookie === lng) return; // Already set to this language

		// Set cookie only if it's different
		cookies.set(cookieName, lng, { path: "/" });
	}, [lng]); // Only depend on lng, not cookies object

	return ret;
}
