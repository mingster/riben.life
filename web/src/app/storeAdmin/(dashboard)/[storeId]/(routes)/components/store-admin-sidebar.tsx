"use client";

import { PanelsTopLeft } from "lucide-react";
import Link from "next/link";

import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import { StoreAdminMenu } from "./store-admin-menu";

interface SidebarProps {
  title: string | undefined | null;
}
export function StoreAdminSidebar({ title }: SidebarProps) {
  const sidebar = useStore(useSidebarToggle, (state) => state);

  if (!sidebar) return null;

  /*
<Button
          className={cn(
            "mb-1 transition-transform duration-300 ease-in-out",
            sidebar?.isOpen === false ? "translate-x-1" : "translate-x-0",
          )}
          variant="link"
          asChild
        >
          <Link href="/" className="flex gap-2">
            <PanelsTopLeft className="mr-1 h-6 w-6" />
            <h1
              className={cn(
                "whitespace-nowrap text-lg font-bold transition-[transform,opacity,display] duration-300 ease-in-out",
                sidebar?.isOpen === false
                  ? "hidden -translate-x-96 opacity-0"
                  : "translate-x-0 opacity-100",
              )}
            >
              {title}
            </h1>
          </Link>
        </Button>
  */

  //  bg-black/80 dark:shadow-secondary bg-inherit backdrop-invert backdrop-blur backdrop-opacity-10
  return (
    <aside
      className={cn(
        "invisible md:visible fixed left-0 top-10 z-20 h-screen -translate-x-full transition-[width] duration-300 ease-in-out lg:translate-x-0 shadow",
        sidebar?.isOpen === false ? "w-[90px]" : "w-72",
      )}
    >
      <SidebarToggle isOpen={sidebar?.isOpen} setIsOpen={sidebar?.setIsOpen} />

      <div className="relative h-full flex flex-col px-3 py-4 overflow-y-auto shadow-md dark:shadow-zinc-800">
        <StoreAdminMenu isOpen={sidebar?.isOpen} title={title} />
      </div>
    </aside>
  );
}
