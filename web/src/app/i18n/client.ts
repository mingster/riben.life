"use client";

import i18next, { type FlatNamespace, type KeyPrefix } from "i18next";
// import LocizeBackend from 'i18next-locize-backend'
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from "i18next-resources-to-backend";
import { useCookies } from "next-client-cookies";
import { useEffect, useState } from "react";

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
		lng: undefined, // let detect the language on client side
		detection: {
			order: ["path", "cookie", "navigator", "htmlTag"],
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

	//console.log(`useTranslation: ${activeLng}`);

	useEffect(() => {
		if (activeLng === i18n.resolvedLanguage) return;
		setActiveLng(i18n.resolvedLanguage);
	}, [activeLng, i18n.resolvedLanguage]);

	useEffect(() => {
		if (!lng || i18n.resolvedLanguage === lng) return;
		i18n.changeLanguage(lng);
	}, [lng, i18n]);

	useEffect(() => {
		if (cookies.get(cookieName) === lng) return;

		if (lng) {
			console.log("will set cookie", cookieName, lng);
			//setCookie(cookieName, lng, { path: "/" });
			cookies.set(cookieName, lng, { path: "/" });
		}
	}, [lng, cookies]);

	return ret;
}
