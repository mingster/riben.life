"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { Store, SupportTicket } from "@/types";
import { StoreLevel, TicketStatus } from "@/types/enum";

import {
	IconArrowRight,
	IconBox,
	IconBuilding,
	IconCalendarCheck,
	IconClock,
	IconCreditCard,
	IconCurrencyDollar,
	IconHelp,
	IconHttpOptions,
	IconLockOpen,
	IconMenu,
	IconMessageCircle,
	IconPackage,
	IconQrcode,
	IconScale,
	IconSettings,
	IconTable,
	IconTicket,
	IconUsers,
} from "@tabler/icons-react";

type Submenu = {
	href: string;
	label: string;
	active: boolean;
};

type Menu = {
	href: string;
	label: string;
	active: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	icon: any;
	submenus: Submenu[];
	badge?: number;
};

type Group = {
	groupLabel: string;
	menus: Menu[];
};

export function GetMenuList(
	store: Store,
	pathname: string,
	options?: {
		supportTicketCount?: number;
	},
): Group[] {
	const STORE_ADMIN_PATH = "/storeAdmin/";
	const nav_prefix = STORE_ADMIN_PATH + store.id;

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const openSupportTicketCount =
		options?.supportTicketCount ??
		store.SupportTicket?.filter(
			(ticket: SupportTicket) => ticket.status === TicketStatus.Open,
		).length ??
		0;

	const cash = {
		href: `${nav_prefix}/cash-cashier`,
		label: t("cash-cashier"),
		active: pathname.includes(`${nav_prefix}/cash-cashier`),
		icon: IconScale,
		submenus: [],
	} as Menu;

	const orderConfirmation = {
		href: `${nav_prefix}/order/awaiting4Confirmation`,
		label: t("Order_awaiting_to_confirm"),
		active: pathname.includes(`${nav_prefix}/order/awaiting4Confirmation`),
		icon: IconPackage,
		submenus: [],
	} as Menu;

	return [
		{
			groupLabel: t("Sales"),
			menus: [
				//...(store.autoAcceptOrder ? [] : [orderConfirmation]),
				// add cash (現金結帳) menu if store level is not free
				// otherwise display orderCofirmation
				...(store.level !== StoreLevel.Free ? [cash] : []),

				{
					href: `${nav_prefix}/order/awaiting_to_ship`,
					label: t("Order_ready_to_ship"),
					active: pathname.includes(`${nav_prefix}/order/awaiting_to_ship`),
					icon: IconCreditCard,
					submenus: [],
				},
				{
					href: `${nav_prefix}/transactions`,
					label: t("Transactions"),
					active: pathname.includes(`${nav_prefix}/transactions`),
					icon: IconCurrencyDollar,
					submenus: [],
				},
				{
					href: `${nav_prefix}/balances`,
					label: t("Balances"),
					active: pathname.includes(`${nav_prefix}/balances`),
					icon: IconCurrencyDollar,
					submenus: [],
				},
				{
					href: `${nav_prefix}/dashboard`,
					label: t("Sales_Reports"),
					active: pathname.includes(`${nav_prefix}/dashboard`),
					icon: IconHttpOptions,
					submenus: [],
				},
			],
		},
		{
			groupLabel: t("Operation"),
			menus: [
				// for not pro stores, if autoAcceptOrder is true, show orderConfirmation menu
				...(!store.autoAcceptOrder ? [orderConfirmation] : []),

				{
					href: `${nav_prefix}/order/awaiting4Process`,
					label: t("Order_inProgress"),
					active: pathname.includes(`${nav_prefix}/order/awaiting4Process`),
					icon: IconArrowRight,
					submenus: [],
				},
				{
					href: `${nav_prefix}/rsvp`,
					label: t("Rsvp_List"),
					active:
						pathname.includes(`${nav_prefix}/rsvp`) &&
						!pathname.includes(`${nav_prefix}/rsvp-settings`),
					icon: IconCalendarCheck,
					submenus: [],
				},
				{
					href: `${nav_prefix}/waiting-list`,
					label: t("Waiting_List"),
					active:
						pathname.includes(`${nav_prefix}/waiting-list`) &&
						!pathname.includes(`${nav_prefix}/waiting-list-settings`),
					icon: IconClock,
					submenus: [],
				},
			],
		},
		{
			groupLabel: t("Customers"),
			menus: [
				{
					href: `${nav_prefix}/customers`,
					label: t("Customer_mgmt"),
					active: pathname.includes(`${nav_prefix}/customers`),
					icon: IconUsers,
					submenus: [],
				},
			],
		},
		{
			groupLabel: t("Support"),
			menus: [
				{
					href: `${nav_prefix}/support`,
					label: t("Tickets"),
					active: pathname.includes(`${nav_prefix}/support`),
					icon: IconTicket,
					submenus: [],
					badge: openSupportTicketCount,
				},
				{
					href: `${nav_prefix}/announcements`,
					label: t("Announcements"),
					active: pathname.includes(`${nav_prefix}/announcements`),
					icon: IconMessageCircle,
					submenus: [],
				},
			],
		},
		{
			//groupLabel: t("Marketing"),
			groupLabel: t("product"),
			menus: [
				{
					href: `${nav_prefix}/categories`,
					label: t("Category"),
					active: pathname.includes(`${nav_prefix}/categories`),
					icon: IconMenu,
					submenus: [],
				},
				{
					href: `${nav_prefix}/products`,
					label: t("Products"),
					active: pathname.includes(`${nav_prefix}/products`),
					icon: IconBox,
					submenus: [],
				},
				{
					href: `${nav_prefix}/product-option-template`,
					label: t("ProductOption_template"),
					active: pathname.includes(`${nav_prefix}/product-option-template`),
					icon: IconLockOpen,
					submenus: [],
				},
				{
					href: `${nav_prefix}/faq`,
					label: t("FAQ"),
					active: pathname.includes(`${nav_prefix}/faq`),
					icon: IconHelp,
					submenus: [],
				},
			],
		},
		{
			groupLabel: t("StoreSettings"),
			menus: [
				{
					href: `${nav_prefix}/settings`,
					label: t("Settings"),
					active: pathname.includes(`${nav_prefix}/settings`),
					icon: IconSettings,
					submenus: [],
				},
				{
					href: `${nav_prefix}/rsvp-settings`,
					label: t("RSVP_Tab_System"),
					active: pathname.includes(`${nav_prefix}/rsvp-settings`),
					icon: IconCalendarCheck,
					submenus: [],
				},
				{
					href: `${nav_prefix}/waiting-list-settings`,
					label: t("StoreSettings_WaitingList"),
					active: pathname.includes(`${nav_prefix}/waiting-list-settings`),
					icon: IconClock,
					submenus: [],
				},
				{
					href: `${nav_prefix}/facility`,
					label: t("Facility_Mgmt"),
					active: pathname.includes(`${nav_prefix}/facility`),
					icon: IconBuilding,
					submenus: [],
				},

				{
					href: `${nav_prefix}/qrcode`,
					label: "QR Code",
					active: pathname.includes(`${nav_prefix}/qrcode`),
					icon: IconQrcode,
					submenus: [],
				},
			],
		},
	];
}
