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
import type { Store } from "@/types";

interface StoreAdminNavbarProps {
  store: Store;
}
export function StoreAdminSheetMenu({ store }: StoreAdminNavbarProps) {

  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger className="lg:hidden" asChild>
          <Button
            className="h-8"
            variant="outline"
            size="icon"
            title="open menu"
          >
            <MenuIcon size={20} />
          </Button>
        </SheetTrigger>
        <SheetContent className="flex h-full flex-col px-3 sm:w-72" side="left">
          <SheetHeader />
          <SheetTitle />
          <SheetDescription />

          <StoreAdminMenu isOpen store={store}/>
        </SheetContent>
      </Sheet>
    </>
  );
}
