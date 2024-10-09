import {
  Bookmark,
  LayoutGrid,
  Settings,
  SquarePen,
  Store,
  Tag,
  Users,
  Wrench,
  CircleDollarSign,
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
};

type Group = {
  groupLabel: string;
  menus: Menu[];
};

export function GetMenuList(pathname: string): Group[] {
  const ADMIN_PATH = "/admin";
  const nav_prefix = ADMIN_PATH;

  return [
    {
      groupLabel: "ADMIN",
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
      groupLabel: "營運統計",
      menus: [],
    },
    {
      groupLabel: "商品目錄",
      menus: [],
    },
    {
      groupLabel: "客戶",
      menus: [
        {
          href: `${nav_prefix}/users`,
          label: "Customers",
          active: pathname.includes(`${nav_prefix}/users`),
          icon: Users,
          submenus: [],
        },
      ],
    },
    {
      groupLabel: "行銷推廣",
      menus: [],
    },
    {
      groupLabel: "商店管理",
      menus: [
        {
          href: `${nav_prefix}/stores`,
          label: "Stores",
          active: pathname.includes(`${nav_prefix}/stores`),
          icon: Store,
          submenus: [],
        },
        {
          href: `${nav_prefix}/categories`,
          label: "Categories",
          active: pathname.includes(`${nav_prefix}/categories`),
          icon: Bookmark,
          submenus: [],
        },
        {
          href: `${nav_prefix}/tags`,
          label: "Tags",
          active: pathname.includes(`${nav_prefix}/tags`),
          icon: Tag,
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
          icon: Settings,
          submenus: [],
        },
        {
          href: `${nav_prefix}/paymentMethods`,
          label: "Payment Methods",
          active: pathname.includes(`${nav_prefix}/paymentMethods`),
          icon: CircleDollarSign,
          submenus: [],
        },
      ],
    },
    {
      groupLabel: "系統",
      menus: [
        {
          href: `${nav_prefix}/maint`,
          label: "Data maint",
          active: pathname.includes(`${nav_prefix}/maint`),
          icon: Wrench,
          submenus: [],
        },
      ],
    },
  ];
}
