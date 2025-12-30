"use client";

import {
	IconBrandMeta,
	IconChevronDown,
	IconChevronUp,
} from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import GoogleLoginButton from "@/components/auth/button-google-login";
import AppleLoginButton from "@/components/auth/button-apple-login";
import PasskeyLoginButton from "@/components/auth/button-passkey-login";
import FormMagicLink from "@/components/auth/form-magic-link";
import FormPhoneOtp from "@/components/auth/form-phone-otp";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n-provider";
import { useParams } from "next/navigation";
import LineLoginButton from "./button-line-login";

// client sign in component - display supported sign in methods.
// show phone otp by default. user click more then show more options (line, google, etc.)
//
export default function ClientSignIn({
	callbackUrl = "/",
	noTitle = false,
}: {
	callbackUrl?: string;
	noTitle?: boolean;
}) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [showMoreOptions, setShowMoreOptions] = useState(false);

	const params = useParams();
	const storeId = params.storeId as string;

	if (storeId) {
		callbackUrl = `/s/${storeId}`;
	}

	return (
		<Card className="w-full max-w-lg max-h-lg p-2">
			{!noTitle && (
				<CardHeader>
					<CardTitle className="text-lg pt-2">{t("signin_title")}</CardTitle>
				</CardHeader>
			)}

			<CardContent className="flex flex-col gap-10">
				{/* Phone OTP form - shown by default */}
				<FormPhoneOtp callbackUrl={callbackUrl} />

				{/* Other authentication methods - shown when "More Options" is clicked */}
				{showMoreOptions && (
					<div className="flex flex-col gap-1">
						<Separator />
						<GoogleLoginButton callbackUrl={callbackUrl} />
						<LineLoginButton callbackUrl={callbackUrl} />
						<AppleLoginButton callbackUrl={callbackUrl} />
						<FormMagicLink callbackUrl={callbackUrl} />

						{/* display supported 3rd party login buttons */}
						<div className="flex items-center justify-center gap-1">
							<PasskeyLoginButton callbackUrl={callbackUrl} />
							<IconBrandMeta className="mr-0 size-4" />
						</div>
					</div>
				)}

				<CardFooter className="flex py-1 justify-end items-center pt-10 gap-2">
					{/* More options toggle button */}
					<Button
						variant="ghost"
						className="text-xs"
						onClick={() => setShowMoreOptions(!showMoreOptions)}
					>
						{showMoreOptions ? (
							<>
								<IconChevronUp className="h-4 w-4" />
								{t("show_less") || "Show Less"}
							</>
						) : (
							<>
								<IconChevronDown className="h-4 w-4" />
								{t("more_options") || "More Options"}
							</>
						)}
					</Button>

					<Link href="/terms" target="_blank" className="text-xs">
						{t("terms_of_service")}
					</Link>

					<Separator orientation="vertical" className="h-4" />

					<Link href="/privacy" target="_blank" className="text-xs">
						{t("privacy_policy")}
					</Link>
				</CardFooter>
			</CardContent>
		</Card>
	);
}
