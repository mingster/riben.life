"use client";

import { IconUserPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useI18n } from "@/providers/i18n-provider";
import ClientSignIn from "./client-signin";

export default function DialogSignIn({
	callbackUrl = "/",
}: {
	callbackUrl?: string;
}) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	return (
		<Dialog>
			<DialogTrigger asChild>
				<div className="flex items-center gap-2 pl-1 pr-2 cursor-pointer hover:text-orange-800 dark:hover:text-orange-300 text-gray-400">
					<IconUserPlus className="mr-0 size-4" />
					<span>
						{t("signin")}
						{t("or")}
						{t("signUp")}
					</span>
				</div>
			</DialogTrigger>
			<DialogContent className="max-w-lg max-h-lg p-2 border-0">
				<DialogHeader>
					<DialogTitle>{t("signin_title")}</DialogTitle>
					<DialogDescription>{t("signin_or_signup")}</DialogDescription>
				</DialogHeader>
				<ClientSignIn callbackUrl={callbackUrl} noTitle={true} />
			</DialogContent>
		</Dialog>
	);
}
