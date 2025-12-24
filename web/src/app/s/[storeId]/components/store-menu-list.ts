import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { Store } from "@/types";
import {
	IconCalendarCheck,
	IconClock,
	IconCoin,
	IconCreditCard,
	IconHistory,
	IconShoppingCart,
} from "@tabler/icons-react";
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
	store: Store,
	storeId: string,
	pathname: string,
): Group[] {
	const STORE_PATH = "/s/";
	const nav_prefix = STORE_PATH + storeId;

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const storeFixedMenu = [
		...(store.useOrderSystem
			? [
					{
						href: `${nav_prefix}/menu`,
						label: t("online_order"),
						active: pathname.includes(`${nav_prefix}/menu`),
						icon: IconShoppingCart,
						submenus: [],
					},
					{
						href: `${nav_prefix}/my-orders`,
						label: t("store_linkToOrder"),
						active: pathname.includes(`${nav_prefix}/my-orders`),
						icon: IconShoppingCart,
						submenus: [],
					},
					{
						href: `${nav_prefix}/waiting-list`,
						label: t("Waiting_List"),
						active: pathname.includes(`${nav_prefix}/waiting-list`),
						icon: IconClock,
						submenus: [],
					},
				]
			: []),

		...(store.useCustomerCredit
			? [
					{
						href: `${nav_prefix}/recharge`,
						label: t("credit_recharge"),
						active: pathname.includes(`${nav_prefix}/recharge`),
						icon: IconCoin,
						submenus: [],
					},
				]
			: []),

		...(store.rsvpSettings?.acceptReservation === true
			? [
					{
						href: `${nav_prefix}/reservation`,
						label: t("reservation"),
						active: pathname === `${nav_prefix}/reservation`,
						icon: IconCalendarCheck,
						submenus: [],
					},
				]
			: []),

		...(store.rsvpSettings?.acceptReservation === true
			? [
					{
						href: `${nav_prefix}/reservation/history`,
						label: t("rsvp_history"),
						active:
							pathname === `${nav_prefix}/reservation/history` ||
							pathname.startsWith(`${nav_prefix}/reservation/history/`),
						icon: IconHistory,
						submenus: [],
					},
				]
			: []),

		...(store.useCustomerCredit
			? [
					{
						href: `${nav_prefix}/my-credit-ledger`,
						label: t("my_credit_ledger"),
						active: pathname.includes(`${nav_prefix}/my-credit-ledger`),
						icon: IconCreditCard,
						submenus: [],
					},
				]
			: []),

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
