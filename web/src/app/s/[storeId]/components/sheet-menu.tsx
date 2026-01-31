"use client";

import { IconHome, IconMenu2 } from "@tabler/icons-react";
import Link from "next/link";

import DropdownCart from "@/components/dropdown-cart";
import { ThemeToggler } from "@/components/theme-toggler";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetTitle,
	SheetDescription,
	SheetHeader,
	SheetTrigger,
} from "@/components/ui/sheet";
import type { Store } from "@/types";
import { useState } from "react";
import { StoreMenu } from "./store-menu";

import { useTranslation } from "@/app/i18n/client";
import DropdownUser from "@/components/auth/dropdown-user";
import { LanguageToggler } from "@/components/language-toggler";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/providers/i18n-provider";
import { useIsHydrated } from "@/hooks/use-hydrated";
import pkg from "../../../../../package.json";
import DropdownNotification from "@/components/notification/dropdown-notification";
import DialogSignIn from "@/components/auth/dialog-sign-in";

const appVersion = pkg.version;

interface props {
	store: Store;
}

// sheet menu for mobile devices to navigate the store.
// it's visible on small screens (lg:hidden)
export function SheetMenu({ store }: props) {
	//export function SheetMenu() {
	//className="lg:hidden"
	const [isOpen, setIsOpen] = useState(false); // true off by default
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const isHydrated = useIsHydrated();

	const { data: session } = authClient.useSession();
	const user = session?.user;

	return (
		<>
			{isHydrated ? (
				<Sheet open={isOpen} onOpenChange={setIsOpen}>
					<SheetTrigger asChild>
						<Button
							className="h-11 w-11 sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0 border-gray/20 bg-stroke/20 hover:text-meta-1 active:bg-stroke/30 touch-manipulation"
							variant="outline"
							size="icon"
						>
							<IconMenu2 className="h-5 w-5 sm:h-4 sm:w-4" />
						</Button>
					</SheetTrigger>
					<SheetContent
						className="flex flex-col w-[calc(100vw-2rem)] max-w-[20rem] px-3 sm:px-4 sm:w-72 sm:max-w-none backdrop-opacity-10 backdrop-invert"
						side="left"
					>
						<SheetTitle className="hidden"></SheetTitle>
						<SheetDescription className="hidden"></SheetDescription>

						<SheetHeader className="shrink-0 pb-1">
							<Button
								variant="link"
								asChild
								className="h-11 w-full justify-start px-3 sm:h-10 sm:min-h-0 touch-manipulation"
							>
								<Link
									href={`/s/${store.id}`}
									className="flex gap-2 items-center"
								>
									<IconHome className="mr-1 h-6 w-6 sm:size-6" />
								</Link>
							</Button>
						</SheetHeader>

						<div className="flex-1 min-h-0 overflow-hidden touch-manipulation">
							<StoreMenu store={store} isOpen title="" setIsOpen={setIsOpen} />
						</div>
						<div className="shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-3 flex-wrap">
							<LanguageToggler />
							<ThemeToggler />
							{session !== null ? (
								<>
									<DropdownNotification />
									<DropdownUser />
								</>
							) : (
								<>
									<DialogSignIn />
								</>
							)}

							{store.useOrderSystem && <DropdownCart />}
						</div>
						<div className="shrink-0 pt-1 pb-1 sm:pb-0 items-center justify-center w-full font-mono text-sm flex flex-col">
							<Link href="/unv" className="w-full sm:w-auto">
								<Button
									variant="link"
									className="w-full text-xs font-mono dark:text-white h-11 sm:w-auto sm:h-9 sm:min-h-0 touch-manipulation"
								>
									{t("system_provider")}
								</Button>
							</Link>
							<span className="text-xs text-muted-foreground font-mono shrink-0">
								{appVersion ? `v${appVersion}` : null}
							</span>
						</div>
					</SheetContent>
				</Sheet>
			) : (
				<Button
					className="h-11 w-11 sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0 border-gray/20 bg-stroke/20 hover:text-meta-1 active:bg-stroke/30"
					variant="outline"
					size="icon"
					disabled
				>
					<IconMenu2 className="h-5 w-5 sm:h-4 sm:w-4" />
				</Button>
			)}
		</>
	);
}
