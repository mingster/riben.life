"use client";

import { cookieName, languages } from "@/app/i18n/settings";
import { useEffect, useState } from "react";

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
import { useCookies } from "next-client-cookies";
import { useTranslation } from "@/app/i18n/client";

export const LanguageToggler = () => {
	const [mounted, setMounted] = useState(false);
	const { i18n } = useTranslation();
	const [activeLng, setActiveLng] = useState(i18n.resolvedLanguage);
	//const { t } = useTranslation();
	//const [, setCookie] = useCookies([cookieName]); //https://github.com/bendotcodes/cookies/tree/main/packages/react-cookie
	const cookies = useCookies();

	const changeLanguage = (lng: string) => {
		i18n.changeLanguage(lng);
		setActiveLng(lng);
		//setCookie(cookieName, lng, { path: "/" });
		cookies.set(cookieName, lng, { path: "/" });

		console.log("activeLng set to: ", lng);
	};

	// useEffect only runs on the client, so now we can safely show the UI
	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return null;
	}

	//console.log("lng: " + activeLng);

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost">{activeLng}</Button>
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
									<DropdownMenuRadioItem key={l} value={l}>
										{l}
									</DropdownMenuRadioItem>
								);
							})}
					</DropdownMenuRadioGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
};

export default LanguageToggler;
