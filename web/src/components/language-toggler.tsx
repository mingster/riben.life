"use client";

import { useCookies } from "next-client-cookies";
import { useEffect, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { cookieName, languages } from "@/app/i18n/settings";
import { NotMountSkeleton } from "@/components/not-mount-skeleton";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const LanguageToggler = () => {
	const [mounted, setMounted] = useState(false);
	const { i18n } = useTranslation();
	const [activeLng, setActiveLng] = useState(i18n.resolvedLanguage);
	//const { t } = useTranslation();

	const cookies = useCookies();

	const changeLanguage = (lng: string) => {
		i18n.changeLanguage(lng);
		setActiveLng(lng);
		//setCookie(cookieName, lng, { path: "/" });
		cookies.set(cookieName, lng, { path: "/" });
		//console.log(`activeLng set to: ${lng}`);
	};

	// useEffect only runs on the client, so now we can safely show the UI
	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return <NotMountSkeleton />;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button className="ml-1 rounded-full border-1 size-8" variant="ghost">
					<div className="font-semibold uppercase text-gray-400  hover:text-orange-800 dark:hover:text-orange-300">
						{activeLng}
					</div>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				<DropdownMenuLabel>{i18n.t("change_language")}</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuRadioGroup
					value={activeLng}
					onValueChange={(val) => changeLanguage(val)}
				>
					{languages
						//.filter((l) => activeLng !== l)
						.map((l) => {
							return (
								<DropdownMenuRadioItem className="uppercase" key={l} value={l}>
									{l}
								</DropdownMenuRadioItem>
							);
						})}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default LanguageToggler;
