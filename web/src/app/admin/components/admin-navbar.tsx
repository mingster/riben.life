"use client";

//import DropdownMessage from "@/components/dropdown-message";
import DropdownNotification from "@/components/dropdown-notification";
import DropdownUser from "@/components/dropdown-user";

import ThemeToggler from "@/components/theme-toggler";
import { useScrollDirection } from "@/lib/use-scroll-direction";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SheetMenu } from "./sheet-menu";

interface NavbarProps {
  title: string;
}

export function AdminNavbar({ title }: NavbarProps) {
  const router = useRouter();

  const session = useSession();
  if (!session) {
    router.push("/api/auth/signin");
  }
  const user = session.data?.user;
  const scrollDirection = useScrollDirection();

  //<header className="sticky top-0 z-10 w-full bg-background/55 shadow backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:shadow-secondary">
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

      <div className="mx-4 flex h-14 items-center sm:mx-8 items-center justify-end space-x-2">
        <div className="flex items-center space-x-4 lg:space-x-0">
          <SheetMenu />
        </div>

        <div className="flex items-center space-x-4 lg:pl-70">
          <h1 className="font-bold">{title}</h1>
        </div>

        {/*<!--  Hidden by default, but visible if screen is larger than 1024px --> */}
        <div className="hidden md:block">
          <div className="flex flex-1 items-center justify-end space-x-1">
            <ThemeToggler />
            <DropdownNotification />
            <DropdownUser user={user} />
          </div>
        </div>
      </div>
    </header>
  );
}
