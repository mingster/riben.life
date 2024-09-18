"use client";
import { HomeIcon } from "lucide-react";

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
import Link from "next/link";

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

      {/* background image */}
      <div className="absolute inset-x-0 top-0 z-20 flex justify-center overflow-hidden pointer-events-none">
        <div className="w-[108rem] flex-none flex justify-end">
          <picture>
            <source
              srcSet={require("@/img/beams/docs@30.avif").default.src}
              type="image/avif"
            />
            <img
              src={require("@/img/beams/docs@tinypng.png").default.src}
              alt=""
              className="w-[71.75rem] flex-none max-w-none dark:hidden"
              decoding="async"
            />
          </picture>
          <picture>
            <source
              srcSet={require("@/img/beams/docs-dark@30.avif").default.src}
              type="image/avif"
            />
            <img
              src={require("@/img/beams/docs-dark@tinypng.png").default.src}
              alt=""
              className="w-[90rem] flex-none max-w-none hidden dark:block"
              decoding="async"
            />
          </picture>
        </div>
      </div>

      <div className="mx-4 flex h-14 items-center sm:mx-8">
        <div className="flex items-center space-x-4 lg:space-x-0">
          <StoreAdminSheetMenu />
        </div>

        <div className="flex items-center space-x-4 lg:pl-80 pl-10">
          <h1 className="grow text-center text-xl font-bold leading-tight tracking-tighter lg:leading-[1.1] text-nowrap">
            <Link className="flex" title="go to store" href={`/${store.id}`}><HomeIcon className="mr-1 h-6 w-6" />{store.name}</Link>
          </h1>
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
