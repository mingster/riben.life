import { MenuIcon, PanelsTopLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import { StoreAdminMenu } from "./store-admin-menu";

export function StoreAdminSheetMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger className="lg:hidden" asChild>
        <Button className="h-8" variant="outline" size="icon">
          <MenuIcon size={20} />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex h-full flex-col px-3 sm:w-72" side="left">
        <SheetHeader>
          <Button
            className="flex items-center justify-center pb-2 pt-1"
            variant="link"
            asChild
          >
            <Link href="/" className="flex items-center gap-2">
              <PanelsTopLeft className="mr-1 h-6 w-6" />
              <h1 className="text-lg font-bold">&nbsp;</h1>
            </Link>
          </Button>
        </SheetHeader>
        <SheetTitle />
        <SheetDescription />

        <StoreAdminMenu isOpen title="" />
      </SheetContent>
    </Sheet>
  );
}
