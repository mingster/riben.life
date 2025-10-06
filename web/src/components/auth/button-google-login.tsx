"use client";

import { GoogleIcon } from "@daveyplate/better-auth-ui";
//import { signIn } from '@/auth';
import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/providers/i18n-provider";
import { Button } from "../ui/button";
import { analytics } from "@/lib/analytics";

const GoogleLoginButton = ({ callbackUrl = "/" }: { callbackUrl?: string }) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const handleClick = async () => {
		const data = await authClient.signIn.social({
			provider: "google",
			callbackURL: callbackUrl,
		});

		analytics.trackLogin("google");
		//console.log(data);
	};
	return (
		<Button variant="outline" className="w-full" onClick={handleClick}>
			<GoogleIcon className="mr-0 size-4" />
			<span>{t("sign_in_with_google")}</span>
		</Button>
	);
};

export default GoogleLoginButton;
