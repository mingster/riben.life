"use client";
import { IconKey } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { analytics } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { clientLogger } from "@/lib/client-logger";
import { getPostSignInRedirect } from "@/lib/liff-return-path";
import { useI18n } from "@/providers/i18n-provider";
import { toastError } from "../toaster";
import { Button } from "../ui/button";

const PasskeyLoginButton = ({
	callbackUrl = "/",
}: {
	callbackUrl?: string;
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const router = useRouter();

	const signInPassKey = async () => {
		try {
			const response = await authClient.signIn.passkey({
				fetchOptions: { throw: true },
			});

			analytics.trackLogin("passkey");

			if (response?.error) {
				const rawMessage = response.error.message;
				const description =
					typeof rawMessage === "string" ? rawMessage : "Unknown error";
				toastError({
					description,
				});
			} else {
				router.push(getPostSignInRedirect(callbackUrl));
			}
		} catch (error) {
			clientLogger.error(error as Error, {
				message: "Passkey login failed",
				metadata: {
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["auth", "passkey", "error"],
				service: "PasskeyLoginButton",
				environment: process.env.NODE_ENV,
				version: process.env.npm_package_version,
			});
			toastError({
				description: error instanceof Error ? error.message : String(error),
			});
		}
	};

	return (
		<Button variant="outline" className="w-full" onClick={signInPassKey}>
			<IconKey className="mr-0 size-4" />
			<span>{t("sign_in_with_passkey")}</span>
		</Button>
	);
};

export default PasskeyLoginButton;
