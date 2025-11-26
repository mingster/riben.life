"use client";

import { IconHome, IconMenu2 } from "@tabler/icons-react";
import Link from "next/link";

import DropdownCart from "@/components/dropdown-cart";
import DropdownMessage from "@/components/dropdown-message";
import DropdownNotification from "@/components/dropdown-notification";
import { ThemeToggler } from "@/components/theme-toggler";
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
import { useState } from "react";
import { StoreMenu } from "./store-menu";

import { useTranslation } from "@/app/i18n/client";
import DropdownUser from "@/components/auth/dropdown-user";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/providers/i18n-provider";

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

	const { data: session } = authClient.useSession();
	const user = session?.user;

	return (
		<Sheet open={isOpen} onOpenChange={setIsOpen}>
			<SheetTrigger asChild>
				<Button
					className="h-10 w-10 min-h-[44px] min-w-[44px] border-gray/20 bg-stroke/20 hover:text-meta-1 active:bg-stroke/30 sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0 touch-manipulation"
					variant="outline"
					size="icon"
				>
					<IconMenu2 className="h-5 w-5 sm:h-4 sm:w-4" />
				</Button>
			</SheetTrigger>
			<SheetContent
				className="flex h-full flex-col px-3 sm:px-4 sm:w-72 backdrop-opacity-10 backdrop-invert"
				side="left"
			>
				<SheetHeader>
					<Button
						className="flex pb-2 pt-1 h-10 min-h-[44px] sm:h-auto sm:min-h-0"
						variant="link"
						asChild
					>
						<Link
							href="/"
							className="flex gap-2 items-center touch-manipulation"
						>
							<IconHome className="mr-1 h-6 w-6 sm:size-6" />
						</Link>
					</Button>
				</SheetHeader>
				<SheetTitle />
				<SheetDescription />
				<StoreMenu store={store} isOpen title="" setIsOpen={setIsOpen} />
				<div className="flex flex-1 items-center justify-center gap-1.5 sm:gap-2">
					<ThemeToggler />
					<DropdownMessage messages={store.StoreAnnouncement} />
					<DropdownNotification />
					<DropdownUser />
					<DropdownCart />
				</div>
				{/*<!-- Hidden by default, but visible if screen is small --> */}
				<div className="hidden md:block" />
				<div className="pt-1 flex flex-1 items-center justify-center w-full font-mono text-sm">
					<Link href="/unv" className="w-full sm:w-auto">
						<Button
							variant="default"
							className="w-full h-10 min-h-[44px] sm:w-auto sm:h-9 sm:min-h-0 touch-manipulation"
						>
							{t("system_provider")}
						</Button>
					</Link>
				</div>
			</SheetContent>
		</Sheet>
	);
}
