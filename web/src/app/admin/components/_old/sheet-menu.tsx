import { MenuIcon } from "lucide-react";
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

import { useTranslation } from "@/app/i18n/client";
import DropdownUser from "@/components/dropdown-user";
import ThemeToggler from "@/components/theme-toggler";
import { useI18n } from "@/providers/i18n-provider";
import { useSession } from "next-auth/react";
import { useState } from "react";

export function SheetMenu() {
	const [isOpen, setIsOpen] = useState(false);
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	//const router = useRouter();
	const session = useSession();
	const user = session.data?.user;

	return (
		<Sheet open={isOpen} onOpenChange={setIsOpen}>
			<SheetTrigger
				className="lg:hidden bg-green-100 dark:bg-green-800"
				asChild
			>
				<Button
					className=" h-8"
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

				{/*<!-- Hidden by default, but visible if screen is small --> */}
				<div className="hidden sm:block">
					<div className="flex flex-1 items-center justify-center space-x-1">
						<ThemeToggler />
						<DropdownUser user={user} />
					</div>
				</div>
				<div className="pt-1 flex flex-1 items-center justify-center space-x-1 w-full font-mono text-sm">
					<Link href="/unv">
						<Button variant="default">{t("system_provider")}</Button>
					</Link>
				</div>
			</SheetContent>
		</Sheet>
	);
}
