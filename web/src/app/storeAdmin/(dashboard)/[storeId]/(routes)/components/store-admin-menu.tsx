"use client";

import { Ellipsis, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useTranslation } from "@/app/i18n/client";
import { CollapseMenuButton } from "@/components/collapse-menu-button";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import type { Store } from "@/types";
import { GetMenuList } from "./menu-list";

interface MenuProps {
  isOpen: boolean | undefined;
  store: Store;
}

// display storeadmin side menu.
// the TooltipProvider  show full length when open; show just the label when not open
export function StoreAdminMenu({ isOpen, store }: MenuProps) {
  const pathname = usePathname();
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  const params = useParams<{ storeId: string }>();
  //console.log(params);
  const menuList = GetMenuList(store, pathname);

  return (
    <ScrollArea className="[&>div>div[style]]:!block">
      <nav className="mt-8 size-full">
        <ul className="flex min-h-[calc(100vh-48px-36px-16px-32px-50px)] flex-col items-start space-y-1 px-2 lg:min-h-[calc(100vh-32px-40px-32px-50px)]">
          {menuList.map(({ groupLabel, menus }, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            <li className={cn("w-full", groupLabel ? "pt-5" : "")} key={index}>
              {(isOpen && groupLabel) || isOpen === undefined ? (
                <p className="max-w-[248px] truncate px-4 pb-2 text-sm font-medium text-muted-foreground">
                  {groupLabel}
                </p>
              ) : !isOpen && isOpen !== undefined && groupLabel ? (
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger className="w-full">
                      <div className="flex w-full items-center justify-center">
                        <Ellipsis className="size-5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{groupLabel}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <p className="pb-2"> </p>
              )}
              {menus.map(
                ({ href, label, icon: Icon, active, submenus }, index) =>
                  submenus.length === 0 ? (
                    // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                    <div className="w-full" key={index}>
                      <TooltipProvider disableHoverableContent>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <Button
                              variant={active ? "outline" : "ghost"}
                              className="mb-1 h-10 w-full justify-start"
                              asChild
                            >
                              <Link href={href} className="">
                                <span
                                  className={cn(isOpen === false ? "" : "mr-4")}
                                >
                                  <Icon size={18} />
                                </span>
                                <p
                                  className={cn(
                                    "max-w-[200px] truncate",
                                    active === true
                                      ? "font-extrabold font-mono"
                                      : "text-primary",
                                    isOpen === false
                                      ? "-translate-x-96 opacity-0"
                                      : "translate-x-0 opacity-100",
                                  )}
                                >
                                  {label}
                                </p>
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          {isOpen === false && (
                            <TooltipContent side="right">
                              {label}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ) : (
                    // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                    <div className="w-full" key={index}>
                      <CollapseMenuButton
                        icon={Icon}
                        label={label}
                        active={active}
                        submenus={submenus}
                        isOpen={true} // force to open submenus
                      />
                    </div>
                  ),
              )}
            </li>
          ))}
        </ul>

        <div className="flex flex-col w-full grow items-end">
          <TooltipProvider disableHoverableContent>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <>
                  {/* sign out button */}
                  <Button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    variant="outline"
                    className="mt-5 h-10 w-full justify-center"
                  >
                    <span className={cn(isOpen === false ? "" : "mr-4")}>
                      <LogOut size={18} />
                    </span>
                    <span
                      className={cn(
                        "whitespace-nowrap",
                        isOpen === false ? "hidden opacity-0" : "opacity-100",
                      )}
                    >
                      {t("signout")}
                    </span>
                  </Button>
                </>
              </TooltipTrigger>
            </Tooltip>
          </TooltipProvider>
        </div>
      </nav>
    </ScrollArea>
  );
}
