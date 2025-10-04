"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/app/i18n/client";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/providers/i18n-provider";

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
				<div className="my-5">
					<Link
						title={t("checkout_signIn")}
						key="signin"
						href="#"
						onClick={() => router.push("/signIn")}
						className="hover:font-bold text-primary"
					>
						{t("checkout_signIn")}
					</Link>
					{t("checkout_or")}
					<Link
						title={t("checkout_signUp")}
						key="signup"
						href="#"
						onClick={() => router.push("/signIn")}
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
