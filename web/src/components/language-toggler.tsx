"use client";

import { useCookies } from "next-client-cookies";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
	const [activeLng, setActiveLng] = useState(i18n.resolvedLanguage || "tw");
	const cookies = useCookies();
	const router = useRouter();

	const changeLanguage = async (lng: string) => {
		// Set cookie first
		cookies.set(cookieName, lng, { path: "/" });

		// Update HTML lang attribute immediately to prevent LanguageDetector from reverting
		if (typeof document !== "undefined") {
			document.documentElement.setAttribute("lang", lng);
		}

		// Change language in i18n
		await i18n.changeLanguage(lng);

		// Update local state
		setActiveLng(lng);

		// Refresh the router to apply language change to server components
		// Use a small delay to ensure cookie is set before server reads it
		setTimeout(() => {
			router.refresh();
		}, 100);
	};

	// Sync activeLng with i18n's resolved language
	useEffect(() => {
		if (activeLng === i18n.resolvedLanguage) return;
		if (i18n.resolvedLanguage) {
			setActiveLng(i18n.resolvedLanguage);
		}
	}, [activeLng, i18n.resolvedLanguage]);

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
				<Button className="ml-1 rounded-full border size-8" variant="ghost">
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
