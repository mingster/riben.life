"use client";
import { Lock, LogIn, LogOut, Settings } from "lucide-react";
import type { User } from "next-auth";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

interface UserButtonProps {
  user: User | undefined | null;
}

export default function DropdownUser({ user }: UserButtonProps) {
  const [mounted, setMounted] = useState(false);
  const { lng } = useI18n();
  const { t } = useTranslation(lng);
  const avatarPlaceholder = "/images/user/avatar_placeholder.png";

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <></>;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          className="flex-none rounded-full border-gray/20 bg-stroke/20 hover:text-meta-1
          dark:border-strokedark dark:bg-meta-4 dark:text-primary dark:hover:text-meta-1"
        >
          <Image
            src={user?.image || avatarPlaceholder}
            alt="User profile picture"
            width={30}
            height={30}
            className="aspect-square rounded-full bg-background object-cover hover:opacity-50"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {user === null || user === undefined ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-pointer" asChild>
                <Link href={`${process.env.NEXT_PUBLIC_API_URL}/auth/signin`}>
                  <LogIn className="mr-1 h-4 w-4" />
                  <span>
                    {t("user_profile_signIn")}/{t("user_profile_signUp")}
                  </span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </DropdownMenuGroup>
          </>
        ) : (
          <>
            <DropdownMenuLabel>{user?.name || "User"}</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-pointer" asChild>
                <Link href="/account">
                  <Settings className="mr-1 h-4 w-4" />
                  <span>{t("user_profile_myAccount")}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" asChild>
                <Link href="/storeAdmin/">
                  <Lock className="mr-1 h-4 w-4" />
                  <span>{t("user_profile_linkTo_storeDashboard")}</span>
                </Link>
              </DropdownMenuItem>

              {user?.role === "ADMIN" && (
                <DropdownMenuItem className="cursor-pointer" asChild>
                  <Link href="/admin">
                    <Lock className="mr-1 h-4 w-4" />
                    <span>{t("user_profile_linkTo_admin")}</span>
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" asChild>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center"
              >
                <LogOut className="mr-1 h-4 w-4" /> {t("user_profile_signOut")}
              </button>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
