"use client";

import DropdownCart from "@/components/dropdown-cart";
import DropdownMessage from "@/components/dropdown-message";
import DropdownNotification from "@/components/dropdown-notification";
import DropdownUser from "@/components/dropdown-user";
import { useScrollDirection } from "@/lib/use-scroll-direction";
import type { Store } from "@/types";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SheetMenu } from "./sheet-menu";
import ThemeToggler from "@/components/theme-toggler";

export interface props {
  visible: boolean;
  store: Store;
}

export const StoreNavbar: React.FC<props> = ({ store, visible }) => {
  const [active, setActive] = useState("");

  //console.log("active", active);
  /*
  const [visible, setVisible] = useState(true);
  const pathName = usePathname();
  if (pathName.includes("checkout")) {
    setVisible(false);
  }
  */

  //const router = useRouter();
  const session = useSession();
  const user = session.data?.user;

  // auto hide navbar on scroll
  const scrollDirection = useScrollDirection();
  //<header className={`sticky ${scrollDirection === "down" ? "-top-24" : "top-0"} z-10 w-full shadow backdrop-blur dark:shadow-secondary`}>

  // normal navbar
  //<header className="sticky top-0 z-10 w-full shadow backdrop-blur dark:shadow-secondary">

  const onNavlinkClick = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
  ) => {
    e.preventDefault();
    const target = window.document.getElementById(
      e.currentTarget.href.split("#")[1],
    );
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  // turn off footer in those pages
  const pathName = usePathname();

  if (
    pathName.includes("billing") ||
    //pathName.includes("checkout") ||
    pathName.includes("faq") ||
    pathName.includes("privacy") ||
    pathName.includes("support") ||
    pathName.includes("terms")
  ) {
    visible = false;
  }
  //}, [visible]);

  if (store == null) return;
  if (store.Categories == null) return;

  if (!visible) return <></>;

  return (
    <header
      className={`sticky ${scrollDirection === "down" ? "-top-24" : "top-0"} z-10 w-full shadow backdrop-blur dark:shadow-secondary`}
    >
      <div className="mx-4 flex h-14 items-center sm:mx-1">
        <div className="flex items-center space-x-4 lg:space-x-0 pl-2">
          <SheetMenu store={store} />
        </div>

        <h1 className="grow text-center text-xl font-bold leading-tight tracking-tighter lg:leading-[1.1]">
          {store.name}
        </h1>

        {/*<!--  Hidden by default, but visible if screen is larger than 1024px --> */}
        <div className="hidden md:block">
          <div className="flex flex-1 items-center justify-end space-x-1">
            <ThemeToggler />
            <DropdownMessage messages={store.StoreAnnouncement} />
            <DropdownNotification />
            <DropdownUser user={user} />
            <DropdownCart />
          </div>
        </div>
      </div>
    </header>
  );
};
