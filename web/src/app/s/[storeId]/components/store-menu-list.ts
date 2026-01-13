import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { Store } from "@/types";
import {
	IconCalendarCheck,
	IconClock,
	IconCoin,
	IconCreditCard,
	IconHistory,
	IconPlus,
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
	badge?: string | number; // Badge text or number to display
};

type Group = {
	groupLabel: string;
	menus: Menu[];
};

export function GetMenuList(
	store: Store,
	storeId: string,
	pathname: string,
	fiatBalance?: number | null,
	fiatCurrency?: string,
): Group[] {
	const STORE_PATH = "/s/";
	const nav_prefix = STORE_PATH + storeId;

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	return [
		...(store.rsvpSettings?.acceptReservation === true
			? [
					{
						groupLabel: t("menu_order_reservation"),
						menus: [
							{
								href: `${nav_prefix}/reservation`,
								label: t("reservation"),
								active: pathname === `${nav_prefix}/reservation`,
								icon: IconCalendarCheck,
								submenus: [],
							},
							{
								href: `${nav_prefix}/reservation/history`,
								label: t("rsvp_history"),
								active:
									pathname === `${nav_prefix}/reservation/history` ||
									pathname.startsWith(`${nav_prefix}/reservation/history/`),
								icon: IconHistory,
								submenus: [],
							},
						],
					},
				]
			: []),
		{
			groupLabel: t("menu_order_related"),
			menus: [
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
								href: `${nav_prefix}/waiting-list`,
								label: t("waiting_list"),
								active: pathname.includes(`${nav_prefix}/waiting-list`),
								icon: IconClock,
								submenus: [],
							},
						]
					: []),
			],
		},
		{
			groupLabel: t("menu_account_financial"),
			menus: [
				{
					href: `${nav_prefix}/my-orders`,
					label: t("store_link_to_order"),
					active: pathname.includes(`${nav_prefix}/my-orders`),
					icon: IconShoppingCart,
					submenus: [],
				},

				{
					href: `${nav_prefix}/my-fiat-ledger`,
					label: t("my_fiat_ledger"),
					active: pathname.includes(`${nav_prefix}/my-fiat-ledger`),
					icon: IconCoin,
					submenus: [],
					badge:
						fiatBalance !== undefined && fiatBalance !== null && fiatBalance > 0
							? new Intl.NumberFormat("en-US", {
									style: "currency",
									currency: (fiatCurrency || "twd").toUpperCase(),
									minimumFractionDigits: 0,
									maximumFractionDigits: 0,
								}).format(fiatBalance)
							: undefined,
				},
				{
					href: `${nav_prefix}/refill-account-balance`,
					label: t("refill_account_balance"),
					active: pathname.includes(`${nav_prefix}/refill-account-balance`),
					icon: IconPlus,
					submenus: [],
				},
				...(store.useCustomerCredit
					? [
							{
								href: `${nav_prefix}/my-credit-ledger`,
								label: t("my_credit_ledger"),
								active: pathname.includes(`${nav_prefix}/my-credit-ledger`),
								icon: IconCreditCard,
								submenus: [],
							},
							{
								href: `${nav_prefix}/refill-credit-points`,
								label: t("credit_refill_points"),
								active: pathname.includes(`${nav_prefix}/refill-credit-points`),
								icon: IconCoin,
								submenus: [],
							},
						]
					: []),
			],
		},

		{
			groupLabel: t("menu_store_related"),
			menus: [
				{
					href: `${nav_prefix}/faq`,
					label: t("f_a_q"),
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
			],
		},
	] as Group[];
}
