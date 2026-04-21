"use client";

import { GoogleIcon } from "@daveyplate/better-auth-ui";
import { useTranslation } from "react-i18next";
//import { signIn } from '@/auth';
import { analytics } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import { Button } from "../ui/button";

const GoogleLoginButton = ({
	callbackUrl = "/",
	className,
}: {
	callbackUrl?: string;
	className?: string;
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const handleClick = async () => {
		const _data = await authClient.signIn.social({
			provider: "google",
			callbackURL: callbackUrl,
		});

		analytics.trackLogin("google");
		//console.log(data);
	};
	return (
		<Button
			variant="outline"
			className={cn("w-full", className)}
			onClick={handleClick}
		>
			<GoogleIcon className="mr-0 size-4" />
			<span>{t("sign_in_with_google")}</span>
		</Button>
	);
};

export default GoogleLoginButton;
