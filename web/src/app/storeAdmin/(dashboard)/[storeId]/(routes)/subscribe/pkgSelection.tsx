"use client";

import { HomeIcon } from "lucide-react";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { StoreModal } from "@/app/storeAdmin/(root)/store-modal";

import DropdownMessage from "@/components/dropdown-message";
import DropdownNotification from "@/components/dropdown-notification";
import DropdownUser from "@/components/dropdown-user";

import { useTranslation } from "@/app/i18n/client";
import ThemeToggler from "@/components/theme-toggler";
import { Button } from "@/components/ui/button";
import { useScrollDirection } from "@/lib/use-scroll-direction";
import { useI18n } from "@/providers/i18n-provider";
import type { Store } from "@/types";
import Link from "next/link";
interface props {
  store: Store;
}

export function PkgSelection({ store }: props) {
  const router = useRouter();
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");


  return (
    <>PkgSelection</>
  )
}
