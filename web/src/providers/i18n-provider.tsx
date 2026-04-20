"use client";

import { createContext, useContext, useMemo } from "react";
import { useTranslation } from "@/app/i18n/client";
import { fallbackLng } from "@/app/i18n/settings";

interface i18nContext {
	lng: string;
}

export const i18nContext = createContext<i18nContext | null>(null);

const I18nProvider = ({
	children,
	initialLng,
}: {
	children: React.ReactNode;
	initialLng?: string;
}) => {
	const { i18n } = useTranslation(initialLng);

	const resolvedLanguage = useMemo(() => {
		if (i18n.resolvedLanguage) {
			return i18n.resolvedLanguage;
		}

		if (initialLng) {
			return initialLng;
		}

		return fallbackLng;
	}, [i18n.resolvedLanguage, initialLng]);

	return (
		<i18nContext.Provider value={{ lng: resolvedLanguage }}>
			{children}
		</i18nContext.Provider>
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
