import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { Store } from "@/types";
import {
	HandHelping,
	Handshake,
	MessageCircleQuestion,
	Siren,
} from "lucide-react";

type Submenu = {
	href: string;
	label: string;
	active: boolean;
};

type Menu = {
	href: string;
	label: string;
	active: boolean;
	icon: any;
	submenus: Submenu[];
};

type Group = {
	groupLabel: string;
	menus: Menu[];
};

export function GetMenuList(
	_store: Store,
	storeId: string,
	pathname: string,
): Group[] {
	const STORE_PATH = "/";
	const nav_prefix = STORE_PATH + storeId;

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const storeFixedMenu = [
		{
			href: `${nav_prefix}/faq`,
			label: t("FAQ"),
			active: pathname.includes(`${nav_prefix}/faq`),
			icon: MessageCircleQuestion,
			submenus: [],
		},
		{
			href: `${nav_prefix}/privacy`,
			label: t("privacy_policy"),
			active: pathname.includes(`${nav_prefix}/privacy`),
			icon: Siren,
			submenus: [],
		},
		{
			href: `${nav_prefix}/terms`,
			label: t("terms_of_service"),
			active: pathname.includes(`${nav_prefix}/terms`),
			icon: Handshake,
			submenus: [],
		},
		{
			href: `${nav_prefix}/support`,
			label: t("support"),
			active: pathname.includes(`${nav_prefix}/support`),
			icon: HandHelping,
			submenus: [],
		},
	] as Menu[];

	const result = [
		/*
  const categoryMenu = store.Categories.map((category) => ({
    href: `${nav_prefix}#${category.id}`,
    label: category.name,
    active: pathname.includes(`${category.id}`),
    icon: Briefcase,
    submenus: [],
  }));


    {
      groupLabel: t("categories"),
      menus: categoryMenu,
    },
*/

		{
			groupLabel: t("menu"),
			menus: storeFixedMenu,
		},
	] as Group[];

	return result;
}
