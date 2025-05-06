"use client";
import { HomeIcon } from "lucide-react";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { StoreAdminSheetMenu } from "./store-admin-sheet-menu";

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
import { StoreLevel } from "@/types/enum";
import Link from "next/link";
import StoreSwitcher from "./store-switcher";

interface StoreAdminNavbarProps {
	store: Store;
}

export function StoreAdminNavbar({ store }: StoreAdminNavbarProps) {
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const session = useSession();
	if (!session) {
		router.push("/api/auth/signin");
	}
	const user = session.data?.user;
	const scrollDirection = useScrollDirection();

	//<header className="sticky top-0 z-10 w-full backdrop-opacity-10 backdrop-invert bg-black/80 shadow backdrop-blur dark:shadow-secondary">

	return (
		<header
			className={`sticky ${scrollDirection === "down" ? "-top-24" : "top-0"} z-10 w-full shadow backdrop-blur dark:shadow-secondary`}
		>
			{/* background image */}
			<div className="absolute inset-x-0 top-0 z-20 flex justify-center overflow-hidden pointer-events-none">
				<div className="w-[108rem] flex-none flex justify-end">
					<picture>
						<source srcSet="/img/beams/docs@30.avif" type="image/avif" />
						<img
							src="/img/beams/docs@tinypng.png"
							alt=""
							className="w-[71.75rem] flex-none max-w-none dark:hidden"
							decoding="async"
						/>
					</picture>
					<picture>
						<source srcSet="/img/beams/docs-dark@30.avif" type="image/avif" />
						<img
							src="/img/beams/docs-dark@tinypng.png"
							alt=""
							className="w-[90rem] flex-none max-w-none hidden dark:block"
							decoding="async"
						/>
					</picture>
				</div>
			</div>

			<div className="mx-4 flex h-14 items-center xs:mx-8">
				<div className="flex items-center space-x-4 lg:space-x-0">
					<StoreAdminSheetMenu store={store} />
				</div>

				<div className="flex items-center space-x-4 lg:pl-10">
					<h1 className="grow text-center text-xl font-bold leading-tight tracking-tighter lg:leading-[1.1] text-nowrap">
						<Link
							className="flex items-center gap-1"
							title={t("back_to_store")}
							href={`/${store.id}`}
						>
							<HomeIcon className="mr-0 size-4" />
							{store.name}
						</Link>
					</h1>
				</div>

				<div className="flex flex-1 items-center justify-end space-x-2">
					<StoreSwitcher />
					<StoreModal />
					{/* stpreModal is to create new store when switcher's create store is clicked */}
					{/* level button */}
					<Button variant="outline" size="sm">
						<Link
							href={`/storeAdmin/${store.id}/subscribe`}
							className="text-xs"
						>
							{store.level === StoreLevel.Free
								? t("storeAdmin_switchLevel_free")
								: store.level === StoreLevel.Pro
									? t("storeAdmin_switchLevel_pro")
									: t("storeAdmin_switchLevel_multi")}
						</Link>
					</Button>

					{/*<!--  Hidden by default, but visible if screen is larger than 1024px --> */}
					<div className="hidden md:block">
						<div className="flex flex-1 items-center justify-end space-x-1">
							<ThemeToggler />
							<DropdownNotification />
							<DropdownUser user={user} />
						</div>
					</div>
				</div>
			</div>
		</header>
	);
}
