"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { Store, SupportTicket } from "@/types";
import { StoreLevel, TicketStatus } from "@/types/enum";

import {
	IconArrowRight,
	IconBell,
	IconBox,
	IconBuilding,
	IconCalendarCheck,
	IconClock,
	IconCoin,
	IconCreditCard,
	IconCurrencyDollar,
	IconHelp,
	IconHistory,
	IconHttpOptions,
	IconLockOpen,
	IconMenu,
	IconMessageCircle,
	IconPackage,
	IconQrcode,
	IconScale,
	IconSettings,
	IconTicket,
	IconUpload,
	IconUser,
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
		readyToConfirmRsvpCount?: number;
	},
): Group[] {
	const STORE_ADMIN_PATH = "/storeAdmin/";
	const nav_prefix = STORE_ADMIN_PATH + store.id;

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const openSupportTicketCount =
		options?.supportTicketCount ??
		(
			store as Store & { SupportTicket?: SupportTicket[] }
		).SupportTicket?.filter(
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
		label: t("order_awaiting_to_confirm"),
		active: pathname.includes(`${nav_prefix}/order/awaiting4Confirmation`),
		icon: IconPackage,
		submenus: [],
	} as Menu;

	return [
		{
			groupLabel: t("reservation"),
			menus: [
				{
					href: `${nav_prefix}/rsvp`,
					label: t("rsvp_week_view"),
					active:
						pathname.includes(`${nav_prefix}/rsvp`) &&
						!pathname.includes(`${nav_prefix}/rsvp-settings`) &&
						!pathname.includes(`${nav_prefix}/rsvp/history`) &&
						!pathname.includes(`${nav_prefix}/rsvp/import`),

					icon: IconCalendarCheck,
					submenus: [],
				},
				{
					href: `${nav_prefix}/rsvp/history`,
					label: t("rsvp_history"),
					active: pathname.startsWith(`${nav_prefix}/rsvp/history`),
					icon: IconHistory,
					submenus: [],
					badge: options?.readyToConfirmRsvpCount,
				},
				{
					href: `${nav_prefix}/rsvp/import`,
					label: t("rsvp_import"),
					active: pathname.includes(`${nav_prefix}/rsvp/import`),
					icon: IconUpload,
					submenus: [],
				},
				{
					href: `${nav_prefix}/checkin`,
					label: t("rsvp_checkin_staff_menu"),
					active: pathname.includes(`${nav_prefix}/checkin`),
					icon: IconQrcode,
					submenus: [],
				},
				{
					href: `${nav_prefix}/waiting-list`,
					label: t("waiting_list"),
					active:
						pathname.includes(`${nav_prefix}/waiting-list`) &&
						!pathname.includes(`${nav_prefix}/waiting-list-settings`),
					icon: IconClock,
					submenus: [],
				},
			],
		},
		{
			groupLabel: t("operation"),
			menus: [
				//...(store.autoAcceptOrder ? [] : [orderConfirmation]),
				// add cash (現金結帳) menu if store level is not free
				// otherwise display orderConfirmation
				...(store.level !== StoreLevel.Free ? [cash] : []),

				// show order ready to ship menu only when useOrderSystem is true
				...(store.useOrderSystem
					? [
							{
								href: `${nav_prefix}/order/awaiting_to_ship`,
								label: t("order_ready_to_ship"),
								active: pathname.includes(
									`${nav_prefix}/order/awaiting_to_ship`,
								),
								icon: IconCreditCard,
								submenus: [],
							},
						]
					: []),

				// for not pro stores, if autoAcceptOrder is true, show orderConfirmation menu
				...(!store.autoAcceptOrder ? [orderConfirmation] : []),

				// show order in progress menu only when useOrderSystem is true
				...(store.useOrderSystem
					? [
							{
								href: `${nav_prefix}/order/awaiting4Process`,
								label: t("order_in_progress"),
								active: pathname.includes(
									`${nav_prefix}/order/awaiting4Process`,
								),
								icon: IconArrowRight,
								submenus: [],
							},
						]
					: []),
			],
		},
		{
			groupLabel: t("sales"),
			menus: [
				{
					href: `${nav_prefix}/dashboard`,
					label: t("sales_reports"),
					active: pathname.includes(`${nav_prefix}/dashboard`),
					icon: IconHttpOptions,
					submenus: [],
				},
				{
					href: `${nav_prefix}/transactions`,
					label: t("transactions"),
					active: pathname.includes(`${nav_prefix}/transactions`),
					icon: IconCurrencyDollar,
					submenus: [],
				},
				{
					href: `${nav_prefix}/balances`,
					label: t("balances"),
					active: pathname.includes(`${nav_prefix}/balances`),
					icon: IconCurrencyDollar,
					submenus: [],
				},
			],
		},

		{
			groupLabel: t("support"),
			menus: [
				{
					href: `${nav_prefix}/support`,
					label: t("tickets"),
					active: pathname.includes(`${nav_prefix}/support`),
					icon: IconTicket,
					submenus: [],
					badge: openSupportTicketCount,
				},
				{
					href: `${nav_prefix}/announcements`,
					label: t("announcements"),
					active: pathname.includes(`${nav_prefix}/announcements`),
					icon: IconMessageCircle,
					submenus: [],
				},
			],
		},
		{
			groupLabel: t("personnel"),
			menus: [
				{
					href: `${nav_prefix}/customers`,
					label: t("customers"),
					active: pathname.includes(`${nav_prefix}/customers`),
					icon: IconUsers,
					submenus: [],
				},
				{
					href: `${nav_prefix}/service-staff`,
					label: t("service_staff"),
					active: pathname.includes(`${nav_prefix}/service-staff`),
					icon: IconUser,
					submenus: [],
				},
			],
		},
		// show product group only when useOrderSystem is true
		...(store.useOrderSystem
			? [
					{
						//groupLabel: t("marketing"),
						groupLabel: t("product"),
						menus: [
							{
								href: `${nav_prefix}/categories`,
								label: t("category"),
								active: pathname.includes(`${nav_prefix}/categories`),
								icon: IconMenu,
								submenus: [],
							},
							{
								href: `${nav_prefix}/products`,
								label: t("products"),
								active: pathname.includes(`${nav_prefix}/products`),
								icon: IconBox,
								submenus: [],
							},
							{
								href: `${nav_prefix}/product-option-template`,
								label: t("product_option_template"),
								active: pathname.includes(
									`${nav_prefix}/product-option-template`,
								),
								icon: IconLockOpen,
								submenus: [],
							},
						],
					},
				]
			: []),
		{
			groupLabel: t("store_settings"),
			menus: [
				{
					href: `${nav_prefix}/faq`,
					label: t("f_a_q"),
					active: pathname.includes(`${nav_prefix}/faq`),
					icon: IconHelp,
					submenus: [],
				},

				{
					href: `${nav_prefix}/settings`,
					label: t("settings_general"),
					active: pathname.includes(`${nav_prefix}/settings`),
					icon: IconSettings,
					submenus: [],
				},
				{
					href: `${nav_prefix}/credit-bonus-rule`,
					label: t("credit_bonus_rules"),
					active: pathname.includes(`${nav_prefix}/credit-bonus-rule`),
					icon: IconCoin,
					submenus: [],
				},
				{
					href: `${nav_prefix}/rsvp-settings`,
					label: t("rsvp_Settings"),
					active: pathname.includes(`${nav_prefix}/rsvp-settings`),
					icon: IconCalendarCheck,
					submenus: [],
				},
				{
					href: `${nav_prefix}/waiting-list-settings`,
					label: t("store_settings_waiting_list"),
					active: pathname.includes(`${nav_prefix}/waiting-list-settings`),
					icon: IconClock,
					submenus: [],
				},
				{
					href: `${nav_prefix}/facility`,
					label: t("facility_mgmt"),
					active: pathname.includes(`${nav_prefix}/facility/1234`),
					icon: IconBuilding,
					submenus: [
						{
							href: `${nav_prefix}/facility`,
							label: t("facility_mgmt"),
							active: pathname === `${nav_prefix}/facility`,
						},
						{
							href: `${nav_prefix}/facility/service-staff-pricing`,
							label: t("facility_service_staff_pricing"),
							active:
								pathname === `${nav_prefix}/facility/service-staff-pricing`,
						},
						{
							href: `${nav_prefix}/facility/pricing-rules`,
							label: t("facility_pricing_rules"),
							active: pathname === `${nav_prefix}/facility/pricing-rules`,
						},
					],
				},
				{
					href: `${nav_prefix}/qrcode`,
					label: "QR Code",
					active: pathname.includes(`${nav_prefix}/qrcode`),
					icon: IconQrcode,
					submenus: [],
				},

				{
					href: `${nav_prefix}/notifications/dashboard`,
					label: t("notification_system"),
					active: pathname.includes(`${nav_prefix}/notifications`),
					icon: IconBell,
					submenus: [
						{
							href: `${nav_prefix}/notifications/dashboard`,
							label: t("notification_dashboard"),
							active: pathname === `${nav_prefix}/notifications/dashboard`,
						},
						{
							href: `${nav_prefix}/notifications/send`,
							label: t("send_notification"),
							active: pathname === `${nav_prefix}/notifications/send`,
						},
						{
							href: `${nav_prefix}/notifications/history`,
							label: t("notification_history"),
							active: pathname === `${nav_prefix}/notifications/history`,
						},
						{
							href: `${nav_prefix}/notifications/preferences`,
							label: t("notification_preferences"),
							active: pathname === `${nav_prefix}/notifications/preferences`,
						},
						{
							href: `${nav_prefix}/notifications/settings`,
							label: t("notification_settings"),
							active: pathname.includes(`${nav_prefix}/notifications/settings`),
						},
						{
							href: `${nav_prefix}/notifications/templates`,
							label: t("notification_templates"),
							active: pathname === `${nav_prefix}/notifications/templates`,
						},
					],
				},
			],
		},
	];
}
