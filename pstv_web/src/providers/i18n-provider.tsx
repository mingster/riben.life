"use client";
import { useCookies } from "react-cookie";

import { cookieName, fallbackLng } from "@/app/i18n/settings";
import { createContext, useContext } from "react";

interface i18nContext {
  lng: string;
}

export const i18nContext = createContext<i18nContext | null>(null);

const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  //const I18nProvider = ({ children, store }: { children: React.ReactNode; store: Store }) => {
  const [cookies, setCookie] = useCookies([cookieName]); //https://github.com/bendotcodes/cookies/tree/main/packages/react-cookie
  let lng = cookies[cookieName];
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

  //if still no language, use hard coded fallback...
  //
  if (!lng) {
    lng = fallbackLng;
    //console.log('to fallback: ' + lng);
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
