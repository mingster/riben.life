"use client";

import { IconBrandMeta } from "@tabler/icons-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import GoogleLoginButton from "@/components/auth/button-google-login";
import PasskeyLoginButton from "@/components/auth/button-passkey-login";
import FormMagicLink from "@/components/auth/form-magic-link";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import { useParams } from "next/navigation";
import LineLoginButton from "./button-line-login";

export default function ClientSignIn({
	callbackUrl = "/",
	noTitle = false,
}: {
	callbackUrl?: string;
	noTitle?: boolean;
}) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const params = useParams();
	const storeId = params.storeId as string;

	if (storeId) {
		callbackUrl = `/${storeId}`;
	}

	//console.log(callbackUrl);

	return (
		<Card className="w-full max-w-lg max-h-lg p-2">
			{!noTitle && (
				<CardHeader>
					<CardTitle>{t("signin_title")}</CardTitle>
				</CardHeader>
			)}

			<CardContent className="flex flex-col gap-10">
				<GoogleLoginButton callbackUrl={callbackUrl} />
				<LineLoginButton callbackUrl={callbackUrl} />
				<FormMagicLink callbackUrl={callbackUrl} />

				{/* display supported 3rd party login buttons */}
				<div className="flex items-center justify-center gap-1">
					<PasskeyLoginButton callbackUrl={callbackUrl} />
					<IconBrandMeta className="mr-0 size-4" />
				</div>

				<Separator className="!w-auto grow pt-5 pb-5 bg-transparent" />

				<CardFooter className="flex py-1 justify-end items-center pt-10">
					<div className="flex gap-1">
						<Link href="/terms" target="_blank" className="text-xs">
							{t("terms_of_service")}
						</Link>

						<Separator orientation="vertical" className="h-4" />

						<Link href="/privacy" target="_blank" className="text-xs">
							{t("privacy_policy")}
						</Link>
					</div>
				</CardFooter>
			</CardContent>
		</Card>
	);
}
