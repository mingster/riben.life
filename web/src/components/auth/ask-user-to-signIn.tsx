"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/app/i18n/client";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/providers/i18n-provider";
import DialogSignIn from "./dialog-sign-in";

export const AskUserToSignIn = () => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const router = useRouter();
	const { data: session } = authClient.useSession();
	//const user = session?.user;

	//let email = session?.user?.email as string;
	//if (!email) email = "";

	return (
		<>
			{!session && (
				<div className="my-5 flex flex-row gap-1">
					<DialogSignIn />

					<Link
						title={t("checkout_sign_in")}
						key="signin"
						href="/signIn"
						onClick={() => router.push("/signIn")}
						className="hover:font-bold text-primary"
					>
						{t("checkout_sign_in")}
					</Link>
					{t("checkout_or")}
					<Link
						title={t("checkout_sign_up")}
						key="signup"
						href="/signIn"
						onClick={() => router.push("/signIn")}
						className="hover:font-bold text-primary"
					>
						{t("checkout_sign_up")}
					</Link>
					{t("checkout_sign_in_note")}
				</div>
			)}
		</>
	);
};
