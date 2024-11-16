import { type FlatNamespace, type KeyPrefix, createInstance } from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import type { FallbackNs } from "react-i18next";
import { initReactI18next } from "react-i18next/initReactI18next";
import { getOptions } from "./settings";

// ANCHOR https://locize.com/blog/next-app-dir-i18n/
// ANCHOR https://github.com/i18next/next-app-dir-i18next-example-ts
const initI18next = async (lng: string, ns: string | string[]) => {
  // on server side we create a new instance for each render, because during compilation everything seems to be executed in parallel
  const i18nInstance = createInstance();
  await i18nInstance
    .use(initReactI18next)
    .use(
      resourcesToBackend(
        (language: string, namespace: string) =>
          import(`./locales/${language}/${namespace}.json`),
      ),
    )
    .init(getOptions(lng, ns));

  return i18nInstance;
};

export async function useTranslation<
  Ns extends FlatNamespace,
  KPrefix extends KeyPrefix<FallbackNs<Ns>> = undefined,
>(lng: string, ns?: Ns, options: { keyPrefix?: KPrefix } = {}) {
  const i18nextInstance = await initI18next(
    lng,
    Array.isArray(ns) ? (ns as string[]) : (ns as string),
  );

  return {
    t: i18nextInstance.getFixedT(lng, ns, options.keyPrefix),
    i18n: i18nextInstance,
  };
}
