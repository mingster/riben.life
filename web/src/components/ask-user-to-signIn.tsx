"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { signIn, useSession } from "@/lib/auth-client";
import Link from "next/link";

export const AskUserToSignIn = () => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const session = useSession();
	const user = session.data?.user;

	//let email = session.data?.user?.email as string;
	//if (!email) email = "";

	return (
		<>
			{!user && (
				<div className="my-5">
					<Link
						title={t("checkout_signIn")}
						key="signin"
						href="#"
						onClick={() => signIn()}
						className="hover:font-bold text-primary"
					>
						{t("checkout_signIn")}
					</Link>
					{t("checkout_or")}
					<Link
						title={t("checkout_signUp")}
						key="signup"
						href="#"
						onClick={() => signIn()}
						className="hover:font-bold text-primary"
					>
						{t("checkout_signUp")}
					</Link>
					{t("checkout_signInNote")}
				</div>
			)}
		</>
	);
};
