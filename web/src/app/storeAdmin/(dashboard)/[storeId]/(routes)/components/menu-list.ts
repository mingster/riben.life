import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { Store } from "@/types";
import { StoreLevel } from "@/types/enum";
import {
  ArrowRight,
  Box,
  CircleHelp,
  Dock,
  DollarSign,
  LayoutGrid,
  MenuIcon,
  MessageCircleMore,
  PackageCheck,
  Scale,
  Settings,
  Tag,
  Ticket,
  Users,
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
};

type Group = {
  groupLabel: string;
  menus: Menu[];
};

export function GetMenuList(store: Store, pathname: string): Group[] {
  const STORE_ADMIN_PATH = "/storeAdmin/";
  const nav_prefix = STORE_ADMIN_PATH + store.id;

  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  const cash = {
    href: `${nav_prefix}/cash-cashier`,
    label: t("cash-cashier"),
    active: pathname.includes(`${nav_prefix}/cash-cashier`),
    icon: Scale,
    submenus: [],
  };

  const orderConfirmation = {
    href: `${nav_prefix}/order/awaiting4Confirmation`,
    label: "確認訂單",
    active: pathname.includes(`${nav_prefix}/order/awaiting4Confirmation`),
    icon: PackageCheck,
    submenus: [],
  };

  return [
    {
      groupLabel: "",
      menus: [
        {
          href: nav_prefix,
          label: t("StoreDashboard"),
          active: pathname.includes("#"),
          icon: LayoutGrid,
          submenus: [],
        },
        ...(store.autoAcceptOrder ? [] : [orderConfirmation]),
        {
          href: `${nav_prefix}/order/awaiting4Processing`,
          label: "出貨管理",
          active: pathname.includes(`${nav_prefix}/order/awaiting4Processing`),
          icon: ArrowRight,
          submenus: [],
        },
      ],
    },
    {
      groupLabel: t("Sales"),
      menus: [
        // add cash menu if store level is not free 現金結帳
        ...(store.level !== StoreLevel.Free ? [cash] : []),
        {
          href: `${nav_prefix}/transactions`,
          label: t("Transactions"),
          active: pathname.includes(`${nav_prefix}/transactions`),
          icon: DollarSign,
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
          active: pathname.includes("/products"),
          icon: Box,
          submenus: [
            {
              href: `${nav_prefix}/products`,
              label: t("AllProducts"),
              active: pathname === `${nav_prefix}/products`,
            },
            {
              href: `${nav_prefix}/products/new`,
              label: t("NewProduct"),
              active: pathname === `${nav_prefix}/products/new`,
            },
          ],
        },
        {
          href: `${nav_prefix}/faqCategory`,
          label: t("FAQ"),
          active: pathname.includes(`${nav_prefix}/faq`),
          icon: CircleHelp,
          submenus: [
            /*
            {
              href: `${nav_prefix}/faqCategory`,
              label: "FAQ Category",
              active: pathname === `${nav_prefix}/faqCategory`,
            },
            {
              href: `${nav_prefix}/faq`,
              label: "FAQ",
              active: pathname === `${nav_prefix}/faq`,
            },*/
          ],
        },
        /*
        {
          href: `${nav_prefix}/tags`,
          label: t("Tags"),
          active: pathname.includes(`${nav_prefix}/tags`),
          icon: Tag,
          submenus: [],
        },*/
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
      ],
    },
  ];
}
