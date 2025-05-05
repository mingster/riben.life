import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from "i18next-resources-to-backend";
import { initReactI18next } from "react-i18next";

import { getOptions } from "./settings";

i18n
	.use(LanguageDetector) // Use the language detector
	.use(initReactI18next) // Pass i18n down to react-i18next
	.use(
		resourcesToBackend(
			(language: string, namespace: string) =>
				import(`./locales/${language}/${namespace}.json`),
		),
	)
	.init(getOptions());

export default i18n;
