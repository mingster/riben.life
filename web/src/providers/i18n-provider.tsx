"use client";

import { useTranslation } from "@/app/i18n/client";
import { fallbackLng } from "@/app/i18n/settings";
//import { useCookies } from "next-client-cookies";
import { createContext, useContext } from "react";

interface i18nContext {
	lng: string;
}

export const i18nContext = createContext<i18nContext | null>(null);

const I18nProvider = ({ children }: { children: React.ReactNode }) => {
	//const I18nProvider = ({ children, store }: { children: React.ReactNode; store: Store }) => {

	const { i18n } = useTranslation(fallbackLng);

	let lng = i18n.resolvedLanguage;

	//console.log("context resolvedLanguage: " + lng);
	if (!lng) lng = fallbackLng;

	/*
  let lng = fallbackLng;

  const cookies = useCookies();
  const cookie = cookies.get(cookieName);

  if (cookie && cookies.get(cookieName) !== lng) {
    lng = cookies.get(cookieName);
  };
  */

	//console.log('cookies lng: ' + lng);
	//setCookie(cookieName, null);

	//try get language from cookie
	//
	/*
  if (lng) {
    lng = acceptLanguage.get(lng);
    console.log('lng2: ' + lng);
  }
  */

	// if not set, use store's default
	//
	if (!lng) {
		//lng = store.defaultLocale;
		//console.log('store default: ' + lng);
	}

	//console.log('cookies: ' + JSON.stringify(cookies));
	//console.log('cookieName: ' + cookies[cookieName]);
	//console.log('fallbackLng: ' + fallbackLng);
	//console.log('lng: ' + lng);

	/*
  if (cookies.has(cookieName)) lng = acceptLanguage.get(req.cookies.get(cookieName).value);
  if (!lng) lng = acceptLanguage.get(req.headers.get('Accept-Language'));
*/

	return (
		<i18nContext.Provider value={{ lng }}>{children}</i18nContext.Provider>
	);
};

export const useI18n = () => {
	const context = useContext(i18nContext);

	if (context === null) {
		throw new Error("i18nContext must be used within an i18nProvider");
	}

	return context;
};

export default I18nProvider;
