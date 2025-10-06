"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { useTranslation } from "@/app/i18n/client";
import { useCookies } from "next-client-cookies";
import { cookieName } from "@/app/i18n/settings";

interface SystemMessage {
	id: string;
	message: string;
	localeId: string;
	published: boolean;
	createdOn: Date;
}

export function SystemMessageDisplay() {
	const [systemMessage, setSystemMessage] = useState<SystemMessage | null>(
		null,
	);
	const [loading, setLoading] = useState(true);
	const [mounted, setMounted] = useState(false);
	const { data: session } = authClient.useSession();
	const { i18n } = useTranslation();
	const cookies = useCookies();
	const [activeLng, setActiveLng] = useState(i18n.resolvedLanguage);

	// useEffect only runs on the client, so now we can safely show the UI
	useEffect(() => {
		setMounted(true);
	}, []);

	// Update activeLng when i18n language changes (same logic as LanguageToggler)
	useEffect(() => {
		if (activeLng === i18n.resolvedLanguage) return;
		setActiveLng(i18n.resolvedLanguage);
	}, [activeLng, i18n.resolvedLanguage]);

	useEffect(() => {
		if (!mounted) return;

		const fetchSystemMessage = async () => {
			try {
				setLoading(true);

				// Use the same language detection logic as LanguageToggler
				// Priority: user's database locale > cookie language > i18n resolved language > English
				const cookieLng = cookies.get(cookieName);
				const systemMessageLng =
					activeLng || session?.user?.locale || cookieLng || "en";

				const response = await fetch(
					`/api/system-message?locale=${systemMessageLng}`,
				);
				if (response.ok) {
					const data = await response.json();
					setSystemMessage(data.message);
				}
			} catch (error) {
				console.error("Failed to fetch system message:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchSystemMessage();
	}, [mounted, session?.user?.locale, cookieName, activeLng, cookies]);

	if (!mounted || loading) {
		return null; // Don't show anything while mounting or loading
	}

	if (!systemMessage?.message) {
		return null; // Don't show anything if no message
	}

	return (
		<Card className="border-green-200 dark:border-green-900">
			<CardContent className="pt-0">{systemMessage.message}</CardContent>
		</Card>
	);
}
