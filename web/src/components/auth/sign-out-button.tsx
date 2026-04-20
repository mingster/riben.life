"use client";

import { useTranslation } from "@/app/i18n/client";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/providers/i18n-provider";
import { IconLogout } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

type props = {
	disabled?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function SignOutButton({ disabled = false, ...props }: props) {
	const router = useRouter();

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const handleClick = async () => {
		authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					router.push("/"); // redirect to login page
				},
			},
		});
	};

	return (
		<div className="pl-2 flex items-center text-nowrap whitespace-nowrap focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1">
			<IconLogout className="mr-0 size-4 text-gray-400" />
			<Button
				variant="ghost"
				disabled={disabled}
				{...props}
				onClick={handleClick}
			>
				{t("account_tab_signout")}
			</Button>
		</div>
	);
}
