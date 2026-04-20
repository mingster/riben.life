"use client";

import { IconBrandApple } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import logger from "@/lib/logger";
import { useI18n } from "@/providers/i18n-provider";

const AppleLoginButton = ({ callbackUrl = "/" }: { callbackUrl?: string }) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const handleClick = async () => {
		try {
			const { error } = await authClient.signIn.social({
				// Better Auth social provider id
				provider: "apple",
				callbackURL: callbackUrl,
			});

			analytics.trackLogin("appleId");

			if (error) {
				logger.error("Apple OAuth error", {
					metadata: {
						error: error instanceof Error ? error.message : String(error),
					},
					tags: ["auth", "apple", "error"],
				});
			}
		} catch (err: unknown) {
			logger.error("Apple OAuth exception", {
				metadata: { error: err instanceof Error ? err.message : String(err) },
				tags: ["auth", "apple", "error"],
			});
		}
	};

	return (
		<Button variant="outline" className="w-full" onClick={handleClick}>
			<IconBrandApple className="mr-0 size-4" />
			<span>{t("sign_in_with_apple")}</span>
		</Button>
	);
};

export default AppleLoginButton;
