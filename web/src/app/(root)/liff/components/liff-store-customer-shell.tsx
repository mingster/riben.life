"use client";

import { useTranslation } from "@/app/i18n/client";
import { StoreMenu } from "@/app/s/[storeId]/components/store-menu";
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
import { IconHome, IconMenu2 } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import { LiffCustomerBottomBar } from "./liff-customer-bottom-bar";

interface LiffStoreCustomerShellProps {
	store: Store;
	routeStoreId: string;
	showStoreAdminLink: boolean;
	/** Same base as `menuListOptions.navPrefix` (e.g. `/liff/{urlSegment}` or `/s/{id}`). */
	customerNavPrefix: string;
	children: React.ReactNode;
}

/**
 * LIFF store layout: same customer nav as `/s/[storeId]` (via {@link StoreMenu}), plus optional store admin entry when the signed-in user has access.
 * On narrow viewports, a bottom bar surfaces primary links and “More” opens the full menu sheet.
 */
export function LiffStoreCustomerShell({
	store,
	routeStoreId,
	showStoreAdminLink,
	customerNavPrefix,
	children,
}: LiffStoreCustomerShellProps) {
	const { t } = useTranslation();
	const [menuOpen, setMenuOpen] = useState(false);

	return (
		<div className="flex min-h-dvh flex-col">
			<Sheet open={menuOpen} onOpenChange={setMenuOpen}>
				<div className="flex shrink-0 justify-end px-1 pt-1 max-md:hidden">
					<SheetTrigger asChild>
						<Button
							type="button"
							variant="outline"
							size="icon"
							className="h-11 w-11 touch-manipulation sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0"
							aria-label={t("open_menu")}
						>
							<IconMenu2 className="h-5 w-5 sm:h-4 sm:w-4" />
						</Button>
					</SheetTrigger>
				</div>
				<SheetContent
					side="left"
					className="flex w-[calc(100vw-2rem)] max-w-[20rem] flex-col px-3 sm:w-72 sm:px-4"
				>
					<SheetTitle className="sr-only">{t("menu")}</SheetTitle>
					<SheetDescription className="sr-only">{store.name}</SheetDescription>
					<SheetHeader className="shrink-0 pb-2">
						<Button
							variant="link"
							asChild
							className="h-11 w-full justify-start px-3 touch-manipulation sm:h-10 sm:min-h-0"
						>
							<Link
								href={customerNavPrefix}
								className="flex items-center gap-2"
								onClick={() => setMenuOpen(false)}
							>
								<IconHome className="h-6 w-6" />
							</Link>
						</Button>
					</SheetHeader>
					<div className="min-h-0 flex-1 overflow-hidden touch-manipulation">
						<StoreMenu
							store={store}
							isOpen={true}
							title={store.name}
							setIsOpen={setMenuOpen}
							routeStoreId={routeStoreId}
							menuListOptions={{
								navPrefix: customerNavPrefix,
								showStoreAdminLink,
							}}
						/>
					</div>
				</SheetContent>
			</Sheet>

			<div className="flex min-h-0 flex-1 flex-col max-md:pb-[calc(4rem+env(safe-area-inset-bottom))]">
				<div className="relative space-y-4">{children}</div>
			</div>

			<div className="fixed bottom-0 left-0 right-0 z-40 md:hidden pb-[env(safe-area-inset-bottom)]">
				<LiffCustomerBottomBar
					store={store}
					customerNavPrefix={customerNavPrefix}
					onOpenMenu={() => setMenuOpen(true)}
					t={t}
				/>
			</div>
		</div>
	);
}
