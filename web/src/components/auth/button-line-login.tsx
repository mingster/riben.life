"use client";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/providers/i18n-provider";
import { IconBrandLine } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { analytics } from "@/lib/analytics";

const LineLoginButton = ({ callbackUrl = "/" }: { callbackUrl?: string }) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const handleClick = async () => {
		try {
			console.log("Starting Line OAuth flow...");
			const { data, error } = await authClient.signIn.social({
				provider: "line",
				callbackURL: callbackUrl,
			});

			analytics.trackLogin("line");

			if (error) {
				console.error("Line OAuth error:", error);
			} else {
				console.log("Line OAuth success:", data);
			}
		} catch (err) {
			console.error("Line OAuth exception:", err);
		}
	};
	return (
		<Button variant="outline" className="w-full" onClick={handleClick}>
			<IconBrandLine className="mr-0 size-4 bg-[#06C755] hover:bg-[#06C755]/10 disabled:bg-[#ffffff]" />
			<span>{t("sign_in_with_line")}</span>
		</Button>
	);
};

export default LineLoginButton;
