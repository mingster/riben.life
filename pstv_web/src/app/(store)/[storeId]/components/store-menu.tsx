"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Ellipsis } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

import { CollapseMenuButton } from "@/components/collapse-menu-button";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Store } from "@/types";
import { GetMenuList } from "./store-menu-list";
import { useState } from "react";

interface MenuProps {
  store: Store;

  isOpen: boolean | undefined;
  title: string | undefined;
  setIsOpen?: (newValue: boolean) => void;
}

//bring to the href and close the side menu

export function StoreMenu({ store, isOpen, title, setIsOpen }: MenuProps) {
  const pathname = usePathname();
  const params = useParams<{ storeId: string }>();
  const menuList = GetMenuList(store, params.storeId, pathname);
  const router = useRouter();

  const [activeSpot, setActiveSpot] = useState("");

  function menuClick(href: string) {
    setActiveSpot(href);

    setIsOpen?.(false);
    //close();
    router.push(href);
  }

  const onPress = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    e.preventDefault();
    const target = window.document.getElementById(
      e.currentTarget.href.split("#")[1],
    );
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <ScrollArea className="[&>div>div[style]]:!block">
      <nav className="mt-8 h-full w-full ">
        {isOpen && <div className="space-y-1 px-2">{title}</div>}
        <ul className="flex min-h-[calc(100vh-48px-36px-16px-32px)] flex-col items-start space-y-1 px-2 lg:min-h-[calc(100vh-32px-40px-32px)]">
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
                        <Ellipsis className="h-5 w-5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{groupLabel}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <p className="pb-2">&nbsp;</p>
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
                              variant={
                                active || activeSpot === href
                                  ? "default"
                                  : "ghost"
                              }
                              className="mb-1 h-10 w-full justify-start"
                              asChild
                            >
                              <Button
                                className={cn(
                                  active || activeSpot === href
                                    ? "text-link"
                                    : "",
                                  "font-semibold hover:opacity-50",
                                )}
                                variant="link"
                                onClick={() => menuClick(href)}
                              >
                                <span
                                  className={cn(isOpen === false ? "" : "mr-4")}
                                >
                                  <Icon size={18} />
                                </span>
                                <p
                                  className={cn(
                                    "max-w-[200px] truncate",
                                    isOpen === false
                                      ? "-translate-x-96 opacity-0"
                                      : "translate-x-0 opacity-100",
                                  )}
                                >
                                  {label}
                                </p>
                              </Button>
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
                        isOpen={isOpen}
                      />
                    </div>
                  ),
              )}
            </li>
          ))}
        </ul>
      </nav>
    </ScrollArea>
  );
}

/*
              {/* list store's category
              {store.Categories.map((category: Category) => (
                <>
                  <div className="w-full" key={category.id}>
                    <TooltipProvider disableHoverableContent>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={"ghost"}
                            className="mb-1 h-10 w-full justify-start"
                            asChild
                          >
                            <Button
                              className="text-link"
                              variant="link"
                              onClick={() =>
                                menuClick(
                                  `/${store.id}/category/${category.id}`,
                                )
                              }
                            >
                              <p
                                className={cn(
                                  "max-w-[200px] truncate",
                                  isOpen === false
                                    ? "-translate-x-96 opacity-0"
                                    : "translate-x-0 opacity-100",
                                )}
                              >
                                {category.name.toUpperCase()}
                              </p>
                            </Button>
                          </Button>
                        </TooltipTrigger>
                        {isOpen === false && (
                          <TooltipContent side="right">
                            {category.name.toUpperCase()}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </>
  */
