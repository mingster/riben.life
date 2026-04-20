"use client";
import { IconBrandLine } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { analytics } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import logger from "@/lib/logger";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import { Button } from "../ui/button";

const LineLoginButton = ({
	callbackUrl = "/",
	className,
}: {
	callbackUrl?: string;
	className?: string;
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const handleClick = async () => {
		try {
			logger.info("Starting Line OAuth flow...");
			const { data, error } = await authClient.signIn.social({
				provider: "line",
				callbackURL: callbackUrl,
			});

			analytics.trackLogin("line");

			if (error) {
				logger.error("Line OAuth error:", {
					metadata: {
						error: error instanceof Error ? error.message : String(error),
					},
					tags: ["error"],
				});
			} else {
				logger.info("Line OAuth success:");
			}
		} catch (_err) {
			logger.error("Line OAuth exception:", {
				tags: ["error"],
			});
		}
	};
	return (
		<Button
			variant="outline"
			className={cn("w-full", className)}
			onClick={handleClick}
		>
			<IconBrandLine className="mr-0 size-4 bg-[#06C755] hover:bg-[#06C755]/10 disabled:bg-[#ffffff]" />
			<span>{t("sign_in_with_line")}</span>
		</Button>
	);
};

export default LineLoginButton;
