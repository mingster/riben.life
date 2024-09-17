import { HomeIcon, MenuIcon } from "lucide-react";
import Link from "next/link";


import DropdownCart from "@/components/dropdown-cart";
import DropdownMessage from "@/components/dropdown-message";
import DropdownNotification from "@/components/dropdown-notification";
import DropdownUser from "@/components/dropdown-user";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Store } from "@/types";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { StoreMenu } from "./store-menu";
import ThemeToggler from "@/components/theme-toggler";

interface props {
  store: Store;
}

// sheet menu for mobile devices to navigate the store.
// it's visible on small screens (lg:hidden)
export function SheetMenu({ store }: props) {
  //export function SheetMenu() {
  //className="lg:hidden"
  const [isOpen, setIsOpen] = useState(false); // true off by default

  //const router = useRouter();
  const session = useSession();
  const user = session.data?.user;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          className="h-8 border-gray/20 bg-stroke/20 hover:text-meta-1"
          variant="outline"
          size="icon"
        >
          <MenuIcon size={20} />
        </Button>
      </SheetTrigger>
      <SheetContent
        className="flex h-full flex-col px-3 sm:w-72 backdrop-opacity-10 backdrop-invert"
        side="left"
      >
        <SheetHeader>
          <Button className="flex pb-2 pt-1" variant="link" asChild>
            <Link href="/" className="flex gap-2">
              <HomeIcon className="mr-1 h-6 w-6" />
            </Link>
          </Button>
        </SheetHeader>
        <SheetTitle />
        <SheetDescription />

        <StoreMenu store={store} isOpen title="" setIsOpen={setIsOpen} />

        {/*<!--  Hidden by default, but visible if screen is small: hidden md:block--> */}
        <div className="">
          <div className="flex flex-1 items-center justify-center space-x-1">
            <ThemeToggler />
            <DropdownMessage messages={store.StoreAnnouncement} />
            <DropdownNotification />
            <DropdownUser user={user} />
            <DropdownCart />
          </div>{" "}
        </div>
      </SheetContent>
    </Sheet>
  );
}
