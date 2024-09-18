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
import { Menu } from "./admin-menu";

export function SheetMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger className="lg:hidden bg-green-100 dark:bg-green-800" asChild>
      <Button className=" h-8" variant="outline" size="icon" title="open menu">
            <MenuIcon size={20} />
          </Button>
      </SheetTrigger>
      <SheetContent className="flex h-full flex-col px-3 sm:w-72" side="left">
      <SheetHeader />
        <SheetTitle />
        <SheetDescription />

        <Menu isOpen />
      </SheetContent>
    </Sheet>
  );
}
