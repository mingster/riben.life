"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { Store, SupportTicket } from "@/types";
import { StoreLevel, TicketStatus } from "@/types/enum";
import {
	ArrowRight,
	BadgeDollarSign,
	Box,
	CircleHelp,
	Dock,
	DollarSign,
	FileQuestion,
	LayoutGrid,
	MenuIcon,
	MessageCircleMore,
	PackageCheck,
	Proportions,
	QrCode,
	Scale,
	Settings,
	Ticket,
	UtensilsCrossed,
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
		icon: Scale,
		submenus: [],
	} as Menu;

	const orderConfirmation = {
		href: `${nav_prefix}/order/awaiting4Confirmation`,
		label: t("Order_awaiting_to_confirm"),
		active: pathname.includes(`${nav_prefix}/order/awaiting4Confirmation`),
		icon: PackageCheck,
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
					icon: ArrowRight,
					submenus: [],
				},

				{
					href: `${nav_prefix}/transactions`,
					label: t("Transactions"),
					active: pathname.includes(`${nav_prefix}/transactions`),
					icon: BadgeDollarSign,
					submenus: [],
				},
				{
					href: `${nav_prefix}/balances`,
					label: t("Balances"),
					active: pathname.includes(`${nav_prefix}/balances`),
					icon: DollarSign,
					submenus: [],
				},
				{
					href: `${nav_prefix}/dashboard`,
					label: t("Sales_Reports"),
					active: pathname.includes(`${nav_prefix}/dashboard`),
					icon: Proportions,
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
					icon: ArrowRight,
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
					icon: Ticket,
					submenus: [],
					badge: openSupportTicketCount,
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
					icon: MenuIcon,
					submenus: [],
				},
				{
					href: `${nav_prefix}/products`,
					label: t("Products"),
					active: pathname.includes(`${nav_prefix}/products`),
					icon: Box,
					submenus: [],
				},
				{
					href: `${nav_prefix}/faq`,
					label: t("FAQ"),
					active: pathname.includes(`${nav_prefix}/faq`),
					icon: CircleHelp,
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
					icon: Settings,
					submenus: [],
				},
				{
					href: `${nav_prefix}/announcements`,
					label: t("Announcements"),
					active: pathname.includes(`${nav_prefix}/announcements`),
					icon: MessageCircleMore,
					submenus: [],
				},
				{
					href: `${nav_prefix}/tables`,
					label: t("storeTables"),
					active: pathname.includes(`${nav_prefix}/tables`),
					icon: UtensilsCrossed,
					submenus: [],
				},
				{
					href: `${nav_prefix}/product-option-template`,
					label: t("ProductOption_template"),
					active: pathname.includes(`${nav_prefix}/product-option-template`),
					icon: Dock,
					submenus: [],
				},
				{
					href: `${nav_prefix}/qrcode`,
					label: "QR Code",
					active: pathname.includes(`${nav_prefix}/qrcode`),
					icon: QrCode,
					submenus: [],
				},
			],
		},
	];
}
