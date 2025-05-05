import { MenuIcon } from "lucide-react";
import Link from "next/link";

import { useTranslation } from "@/app/i18n/client";
import DropdownCart from "@/components/dropdown-cart";
import DropdownMessage from "@/components/dropdown-message";
import DropdownNotification from "@/components/dropdown-notification";
import DropdownUser from "@/components/dropdown-user";
import ThemeToggler from "@/components/theme-toggler";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { useI18n } from "@/providers/i18n-provider";
import type { Store } from "@/types";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { StoreAdminMenu } from "./store-admin-menu";

interface StoreAdminNavbarProps {
	store: Store;
}
export function StoreAdminSheetMenu({ store }: StoreAdminNavbarProps) {
	const [isOpen, setIsOpen] = useState(false);
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	//const router = useRouter();
	const session = useSession();
	const user = session.data?.user;

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

					<StoreAdminMenu isOpen store={store} />

					{/*<!-- Hidden by default, but visible if screen is small --> */}
					<div className="hidden sm:block">
						<div className="flex flex-1 items-center justify-center space-x-1">
							<ThemeToggler />
							<DropdownMessage messages={store.StoreAnnouncement} />
							<DropdownNotification />
							<DropdownUser user={user} />
							<DropdownCart />
						</div>{" "}
					</div>
					<div className="pt-1 flex flex-1 items-center justify-center space-x-1 w-full font-mono text-sm">
						<Link href="/unv">
							<Button variant="default">{t("system_provider")}</Button>
						</Link>
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
