"use client";
import { IconKey } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/providers/i18n-provider";
import { toastError } from "../toaster";
import { Button } from "../ui/button";
import { clientLogger } from "@/lib/client-logger";
import { analytics } from "@/lib/analytics";

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
				toastError({
					description: response.error.message || "Unknown error",
				});
			} else {
				router.push(callbackUrl);
				//onSuccess()
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
			toastError({ description: error as string });
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
