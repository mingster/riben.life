"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { StoreAdminSheetMenu } from "./store-admin-sheet-menu";

import { StoreModal } from "@/app/storeAdmin/(root)/store-modal";

import DropdownMessage from "@/components/dropdown-message";
import DropdownNotification from "@/components/dropdown-notification";
import DropdownUser from "@/components/dropdown-user";

import StoreSwitcher from "./store-switcher";
import type { Store } from "@/types";
import { useScrollDirection } from "@/lib/use-scroll-direction";
import ThemeToggler from "@/components/theme-toggler";

interface StoreAdminNavbarProps {
  store: Store;
}

export function StoreAdminNavbar({ store }: StoreAdminNavbarProps) {
  const router = useRouter();

  const session = useSession();
  if (!session) {
    router.push("/api/auth/signin");
  }
  const user = session.data?.user;
  const scrollDirection = useScrollDirection();

  //<header className="sticky top-0 z-10 w-full backdrop-opacity-10 backdrop-invert bg-black/80 shadow backdrop-blur dark:shadow-secondary">

  return (
    <header
      className={`sticky ${scrollDirection === "down" ? "-top-24" : "top-0"} z-10 w-full shadow backdrop-blur dark:shadow-secondary`}
    >
      <div className="mx-4 flex h-14 items-center sm:mx-8">
        <div className="flex items-center space-x-4 lg:space-x-0">
          <StoreAdminSheetMenu />
        </div>

        <div className="flex items-center space-x-4 lg:pl-70">
          <h1 className="font-bold">&nbsp;</h1>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          <StoreSwitcher />
          <StoreModal />
          <ThemeToggler />
          <DropdownNotification />
          {user != null && <DropdownUser user={user} />}
        </div>
      </div>
    </header>
  );
}
