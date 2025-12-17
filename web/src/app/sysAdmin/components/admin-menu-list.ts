import {
	IconBell,
	IconBookmark,
	IconBuildingStore,
	IconClock,
	IconCurrencyDollar,
	IconLanguage,
	IconMail,
	IconMapPin,
	IconMessageCircle,
	IconMoneybag,
	IconSettings,
	IconTag,
	IconTruck,
	IconUsers,
	IconWreckingBall,
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
};

type Group = {
	groupLabel: string;
	menus: Menu[];
};

export function GetMenuList(pathname: string): Group[] {
	const ADMIN_PATH = "/sysAdmin";
	const nav_prefix = ADMIN_PATH;

	return [
		/*
		{
			groupLabel: "HOME",
			menus: [
				{
					href: nav_prefix,
					label: "Dashboard",
					active: pathname.includes(nav_prefix),
					icon: LayoutGrid,
					submenus: [],
				},
			],
		},
		
		{
			groupLabel: "商品目錄",
			menus: [],
		},
		{
			groupLabel: "行銷推廣",
			menus: [],
		},
		*/
		{
			groupLabel: "營運統計",
			menus: [
				{
					href: `${nav_prefix}/subscriptions`,
					label: "Subscriptions",
					active: pathname.includes(`${nav_prefix}/subscriptions`),
					icon: IconMoneybag,
					submenus: [],
				},
			],
		},
		{
			groupLabel: "客戶",
			menus: [
				{
					href: `${nav_prefix}/users`,
					label: "Customers",
					active: pathname.includes(`${nav_prefix}/users`),
					icon: IconUsers,
					submenus: [],
				},
			],
		},
		{
			groupLabel: "商店管理",
			menus: [
				{
					href: `${nav_prefix}/stores`,
					label: "Stores",
					active: pathname.includes(`${nav_prefix}/stores`),
					icon: IconBuildingStore,
					submenus: [],
				},
				{
					href: `${nav_prefix}/categories`,
					label: "Categories",
					active: pathname.includes(`${nav_prefix}/categories`),
					icon: IconBookmark,
					submenus: [],
				},
				{
					href: `${nav_prefix}/tags`,
					label: "Tags",
					active: pathname.includes(`${nav_prefix}/tags`),
					icon: IconTag,
					submenus: [],
				},
			],
		},

		{
			groupLabel: "系統",
			menus: [
				{
					href: `${nav_prefix}/notifications/settings`,
					label: "Notification",
					active: pathname.includes(`${nav_prefix}/notifications/settings`),
					icon: IconBell,
					submenus: [],
				},
				{
					href: `${nav_prefix}/sysmsg`,
					label: "System Messages",
					active: pathname.includes(`${nav_prefix}/sysmsg`),
					icon: IconMessageCircle,
					submenus: [],
				},
				{
					href: `${nav_prefix}/mail-queue`,
					label: "Mail Queue",
					active: pathname.includes(`${nav_prefix}/mail-queue`),
					icon: IconMail,
					submenus: [],
				},
				{
					href: `${nav_prefix}/syslog`,
					label: "System Logs",
					active: pathname.includes(`${nav_prefix}/syslog`),
					icon: IconClock,
					submenus: [],
				},
				{
					href: `${nav_prefix}/maint`,
					label: "Data maint",
					active: pathname.includes(`${nav_prefix}/maint`),
					icon: IconWreckingBall,
					submenus: [],
				},
				{
					href: `${nav_prefix}/geo-ip`,
					label: "Geo IP",
					active: pathname.includes(`${nav_prefix}/geo-ip`),
					icon: IconMapPin,
					submenus: [],
				},
			],
		},

		{
			groupLabel: "設定",
			menus: [
				{
					href: `${nav_prefix}/settings`,
					label: "Settings",
					active: pathname.includes(`${nav_prefix}/settings`),
					icon: IconSettings,
					submenus: [],
				},
				{
					href: `${nav_prefix}/paymentMethods`,
					label: "Payment Methods",
					active: pathname.includes(`${nav_prefix}/paymentMethods`),
					icon: IconCurrencyDollar,
					submenus: [],
				},
				{
					href: `${nav_prefix}/shipMethods`,
					label: "Shipping Methods",
					active: pathname.includes(`${nav_prefix}/shipMethods`),
					icon: IconTruck,
					submenus: [],
				},
				{
					href: `${nav_prefix}/mail-templates`,
					label: "Mail Templates",
					active: pathname.includes(`${nav_prefix}/mail-templates`),
					icon: IconMail,
					submenus: [],
				},
				{
					href: `${nav_prefix}/locales`,
					label: "Locales",
					active: pathname.includes(`${nav_prefix}/locales`),
					icon: IconLanguage,
					submenus: [],
				},
				{
					href: `${nav_prefix}/currencies`,
					label: "Currencies",
					active: pathname.includes(`${nav_prefix}/currencies`),
					icon: IconCurrencyDollar,
					submenus: [],
				},
			],
		},
	];
}
