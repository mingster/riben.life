"use client";

import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import type { StoreSettings } from "@prisma-mongo/prisma/client";
import { StoreAdminFooter } from "./store-admin-footer";
import { StoreAdminNavbar } from "./store-admin-navbar";
import { StoreAdminSidebar } from "./store-admin-sidebar";
import type { Store } from "@/types";

export interface props {
  sqlData: Store;
  mongoData: StoreSettings | null;
  children: React.ReactNode;
}

const StoreAdminLayout: React.FC<props> = ({
  sqlData,
  mongoData,
  children,
}) => {
  const sidebar = useStore(useSidebarToggle, (state) => state);

  if (!sidebar) return null;

  //<div className="bg-top bg-cover bg-no-repeat bg-[url('/images/beams/hero@75.jpg')] dark:bg-[url('/images/beams/hero-dark@90.jpg')]">
  return (
    <div className="">
      <StoreAdminNavbar store={sqlData} />
      <StoreAdminSidebar title={sqlData?.name} />
      <main
        className={cn(
          "min-h-[calc(100vh_-_56px)] transition-[margin-left] duration-300 ease-in-out ",
          sidebar?.isOpen === false ? "md:ml-[90px]" : "md:ml-72",
        )}
      >
        {children}
      </main>
      <footer
        className={cn(
          "transition-[margin-left] duration-300 ease-in-out",
          sidebar?.isOpen === false ? "md:ml-[90px]" : "md:ml-72",
        )}
      >
        <StoreAdminFooter />
      </footer>
    </div>
  );
};
export default StoreAdminLayout;
