"use client";

import {
	IconArrowRight,
	IconBell,
	IconBox,
	IconBuildingStore,
	IconCalendar,
	IconClipboardList,
	IconCoin,
	IconCreditCard,
	IconCurrencyDollar,
	IconFileText,
	IconHelp,
	IconFileImport,
	IconHistory,
	IconHttpOptions,
	IconList,
	IconLockOpen,
	IconMenu,
	IconMessageCircle,
	IconPackage,
	IconQrcode,
	IconScale,
	IconSettings,
	IconTicket,
	IconToggleRight,
	IconUser,
	IconUsers,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { Store, SupportTicket } from "@/types";
import { StoreLevel, TicketStatus } from "@/types/enum";

export type StoreAdminMenuSubmenu = {
	href: string;
	label: string;
	active: boolean;
};

export type StoreAdminMenuEntry = {
	href: string;
	label: string;
	active: boolean;
	icon: ComponentType<{ className?: string }>;
	submenus: StoreAdminMenuSubmenu[];
	badge?: number;
};

export type StoreAdminMenuGroup = {
	groupLabel: string;
	menus: StoreAdminMenuEntry[];
};

type Submenu = StoreAdminMenuSubmenu;
type Menu = StoreAdminMenuEntry;
type Group = StoreAdminMenuGroup;

export function GetMenuList(
	store: Store,
	pathname: string,
	options?: {
		supportTicketCount?: number;
		/** Live open root-ticket count from SWR; falls back to supportTicketCount when undefined. */
		unreadSupportTicketCount?: number;
		/** RSVP nav badge (e.g. ready-to-confirm count). */
		readyToConfirmRsvpCount?: number;
		/** Waitlist nav badge: count of **awaiting** (`waiting` only) in current session. */
		waitlistQueueCount?: number;
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
			(ticket: SupportTicket) =>
				ticket.status === TicketStatus.Open &&
				(ticket.threadId === null ||
					ticket.threadId === undefined ||
					ticket.threadId === ""),
		).length ??
		0;

	const unreadSupportTicketBadge =
		options?.unreadSupportTicketCount ?? openSupportTicketCount;

	const rsvpSettings = (
		store as Store & {
			rsvpSettings?: {
				acceptReservation?: boolean;
			} | null;
		}
	).rsvpSettings;

	const waitListSettings = (
		store as Store & {
			waitListSettings?: { enabled?: boolean } | null;
		}
	).waitListSettings;

	const acceptReservation = Boolean(rsvpSettings?.acceptReservation);
	const waitlistEnabled = Boolean(waitListSettings?.enabled);

	const readyToConfirmRsvp = options?.readyToConfirmRsvpCount ?? 0;

	const waitlistQueueBadge = options?.waitlistQueueCount ?? 0;

	const cash = {
		href: `${nav_prefix}/cash-cashier`,
		label: t("cash_cashier"),
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
		...(store.useOrderSystem
			? [
					{
						groupLabel: t("operation"),
						menus: [
							// add cash (現金結帳) menu if store level is not free
							...(store.level !== StoreLevel.Free ? [cash] : []),
							{
								href: `${nav_prefix}/order/awaiting_to_ship`,
								label: t("order_ready_to_ship"),
								active: pathname.includes(
									`${nav_prefix}/order/awaiting_to_ship`,
								),
								icon: IconCreditCard,
								submenus: [],
							},
							...(!store.autoAcceptOrder ? [orderConfirmation] : []),
							{
								href: `${nav_prefix}/order/awaiting4Process`,
								label: t("order_in_progress"),
								active: pathname.includes(
									`${nav_prefix}/order/awaiting4Process`,
								),
								icon: IconArrowRight,
								submenus: [],
							},
						],
					} satisfies Group,
				]
			: []),
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
					badge: unreadSupportTicketBadge,
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
		...(waitlistEnabled
			? [
					{
						groupLabel: t("store_admin_waitlist_nav_group"),
						menus: [
							{
								href: `${nav_prefix}/waitlist`,
								label: t("store_admin_waitlist_queue"),
								active: pathname.includes(`${nav_prefix}/waitlist`),
								icon: IconList,
								submenus: [],
								badge: waitlistQueueBadge,
							},

							{
								href: `${nav_prefix}/waitlist-settings`,
								label: t("store_admin_waitlist_settings"),
								active: pathname.includes(`${nav_prefix}/waitlist-settings`),
								icon: IconClipboardList,
								submenus: [],
							},
						],
					} as Group,
				]
			: []),
		...(acceptReservation
			? [
					{
						groupLabel: t("store_admin_rsvp_group"),
						menus: [
							{
								href: `${nav_prefix}/rsvp/history`,
								label: t("store_admin_rsvp_reservations"),
								active: pathname.includes(`${nav_prefix}/rsvp/history`),
								icon: IconHistory,
								submenus: [],
								badge: readyToConfirmRsvp,
							},
							{
								href: `${nav_prefix}/rsvp/import`,
								label: t("store_admin_rsvp_import"),
								active: pathname.includes(`${nav_prefix}/rsvp/import`),
								icon: IconFileImport,
								submenus: [],
							},
							{
								href: `${nav_prefix}/rsvp-settings`,
								label: t("store_admin_rsvp_settings"),
								active: pathname.includes(`${nav_prefix}/rsvp-settings`),
								icon: IconCalendar,
								submenus: [],
							},

							{
								href: `${nav_prefix}/facility`,
								label: t("store_admin_facilities"),
								active: pathname.includes(`${nav_prefix}/facility`),
								icon: IconBuildingStore,
								submenus: [
									{
										href: `${nav_prefix}/facility`,
										label: t("facility_mgmt"),
										active:
											pathname === `${nav_prefix}/facility` ||
											pathname === `${nav_prefix}/facility/`,
									},
									{
										href: `${nav_prefix}/facility/service-staff-pricing`,
										label: t("facility_service_staff_pricing"),
										active: pathname.includes(
											`${nav_prefix}/facility/service-staff-pricing`,
										),
									},
									{
										href: `${nav_prefix}/facility/pricing-rules`,
										label: t("facility_pricing_rules"),
										active: pathname.includes(
											`${nav_prefix}/facility/pricing-rules`,
										),
									},
								],
							},
						],
					} as Group,
				]
			: []),
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
			groupLabel: t("notification_system"),
			menus: [
				{
					href: `${nav_prefix}/notifications/dashboard`,
					label: t("notification_dashboard"),
					active: pathname === `${nav_prefix}/notifications/dashboard`,
					icon: IconBell,
					submenus: [],
				},
				{
					href: `${nav_prefix}/notifications/send`,
					label: t("send_notification"),
					active: pathname === `${nav_prefix}/notifications/send`,
					icon: IconBell,
					submenus: [],
				},
				{
					href: `${nav_prefix}/notifications/history`,
					label: t("notification_history"),
					active: pathname === `${nav_prefix}/notifications/history`,
					icon: IconBell,
					submenus: [],
				},
				{
					href: `${nav_prefix}/notifications/preferences`,
					label: t("notification_preferences"),
					active: pathname === `${nav_prefix}/notifications/preferences`,
					icon: IconBell,
					submenus: [],
				},
				{
					href: `${nav_prefix}/notifications/settings`,
					label: t("notification_settings"),
					active: pathname.includes(`${nav_prefix}/notifications/settings`),
					icon: IconBell,
					submenus: [],
				},
				{
					href: `${nav_prefix}/notifications/templates`,
					label: t("notification_templates"),
					active: pathname === `${nav_prefix}/notifications/templates`,
					icon: IconBell,
					submenus: [],
				},
			],
		},
		{
			groupLabel: t("store_content"),
			menus: [
				{
					href: `${nav_prefix}/faq`,
					label: t("f_a_q"),
					active: pathname.includes(`${nav_prefix}/faq`),
					icon: IconHelp,
					submenus: [],
				},
				{
					href: `${nav_prefix}/policies`,
					label: t("policies"),
					active: pathname.includes(`${nav_prefix}/policies`),
					icon: IconFileText,
					submenus: [],
				},
			],
		},

		{
			groupLabel: t("store_settings"),
			menus: [
				{
					href: `${nav_prefix}/systems`,
					label: t("store_admin_systems_nav"),
					active: pathname.includes(`${nav_prefix}/systems`),
					icon: IconToggleRight,
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
					href: `${nav_prefix}/qrcode`,
					label: t("store_admin_qr_code"),
					active: pathname.includes(`${nav_prefix}/qrcode`),
					icon: IconQrcode,
					submenus: [],
				},
				...(store.level !== StoreLevel.Free
					? [
							{
								href: `${nav_prefix}/billing`,
								label: t("store_admin_billing_nav"),
								active: pathname.includes(`${nav_prefix}/billing`),
								icon: IconCreditCard,
								submenus: [],
							} as Menu,
						]
					: []),
			],
		},
	];
}
