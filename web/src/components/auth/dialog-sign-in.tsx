"use client";

import { IconUserPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
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

	/*
	<span>
						{t("signin")}
						{t("or")}
						{t("sign_up")}
					</span>
	*/
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					size="icon"
					className="flex-none rounded-full border-gray/20 bg-stroke/20 hover:text-meta-1 dark:border-strokedark dark:bg-meta-4 dark:text-primary dark:hover:text-meta-1"
				>
					<IconUserPlus className="size-5 text-slate-400 duration-300 ease-in-out hover:opacity-50" />
				</Button>
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
