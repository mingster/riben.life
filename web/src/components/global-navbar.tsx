"use client";
import { useEffect, useState } from "react";

import { useSession } from "next-auth/react";

import DropdownMessage from "@/components/dropdown-message";
import DropdownNotification from "@/components/dropdown-notification";
import DropdownUser from "@/components/dropdown-user";

import { PanelsTopLeft } from "lucide-react";
//import { cn } from '@/lib/utils';
import Image from "next/image";
import Link from "next/link";
import ThemeToggler from "./theme-toggler";

//import { useI18n } from '@/providers/i18n-provider';
//import { useTranslation } from '@/app/i18n/client';

interface NavbarProps {
  title: string;
}

export function Navbar({ title }: NavbarProps) {
  const [mounted, setMounted] = useState(false);

  const session = useSession();
  const user = session.data?.user;

  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return <></>;

  /*
  if (process.env.NODE_ENV === 'development') {
    log.debug('session: ' + JSON.stringify(session));
    log.debug('user: ' + JSON.stringify(user));
  }
  */
  const logo = null;
  return (
    <header className="sticky top-0 z-10 w-full">
      <div className="mx-4 flex h-14 items-center sm:mx-8">
        <div className="flex items-center space-x-4 lg:space-x-0">
          <Link href="/" className="flex cursor-pointer">
            {logo != null ? (
              <>
                <Image
                  src={logo}
                  className="h-17 w-100 pl-0 pt-0"
                  alt={"LOGO"}
                />
              </>
            ) : (
              <>
                <PanelsTopLeft className="mr-1 h-6 w-6" />
                <h1 className="font-bold">{title}</h1>
              </>
            )}
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <ThemeToggler />
          <DropdownMessage messages={[]} />
          <DropdownNotification />
          <DropdownUser user={user} />
        </div>
      </div>
    </header>
  );
}
