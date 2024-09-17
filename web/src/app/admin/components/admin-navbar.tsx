"use client";

//import DropdownMessage from "@/components/dropdown-message";
import DropdownNotification from "@/components/dropdown-notification";
import DropdownUser from "@/components/dropdown-user";

import { useScrollDirection } from "@/lib/use-scroll-direction";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SheetMenu } from "./sheet-menu";
import ThemeToggler from "@/components/theme-toggler";

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
      <div className="mx-4 flex h-14 items-center sm:mx-8">
        <div className="flex items-center space-x-4 lg:space-x-0">
          <SheetMenu />
        </div>
        <div className="flex items-center space-x-4 lg:pl-70">
          <h1 className="font-bold">{title}</h1>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <DropdownNotification />
          <ThemeToggler />
          {user != null && <DropdownUser user={user} />}
        </div>
      </div>
    </header>
  );
}
