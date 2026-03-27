"use client";

import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useI18n } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { IconCalendarCheck, IconDots } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface LiffStoreAdminMobileBottomBarProps {
	storeId: string;
}

/**
 * LIFF-oriented narrow-viewport store admin quick nav + More (opens the mobile sidebar sheet).
 * Renders from {@link StoreAdminLayout} when the dashboard is shown; source lives under `/liff` for colocation with other LIFF chrome.
 */
export function LiffStoreAdminMobileBottomBar({
	storeId,
}: LiffStoreAdminMobileBottomBarProps) {
	const pathname = usePathname();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const { setOpenMobile } = useSidebar();

	const prefix = `/storeAdmin/${storeId}`;

	const waitlistHref = `${prefix}/rsvp/waitlist`;
	const waitlistActive = pathname.startsWith(waitlistHref);

	const items = [
		{
			id: "waitlist",
			href: waitlistHref,
			label: t("waiting_list"),
			icon: IconCalendarCheck,
			active: waitlistActive,
		},
	];

	return (
		<nav
			className="flex flex-col border-t bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/85 pb-[env(safe-area-inset-bottom)]"
			aria-label={t("store_admin_nav_landmark")}
		>
			<div className="flex min-h-14 items-stretch justify-between gap-0.5 px-1 pt-1">
				{items.map((item) => {
					const Icon = item.icon;
					return (
						<Link
							key={item.id}
							href={item.href}
							className={cn(
								"flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 text-xs font-medium touch-manipulation",
								item.active
									? "text-primary bg-primary/10"
									: "text-muted-foreground hover:text-foreground",
							)}
							aria-current={item.active ? "page" : undefined}
						>
							<Icon className="h-5 w-5 shrink-0" aria-hidden />
							<span className="line-clamp-2 w-full text-center leading-tight">
								{item.label}
							</span>
						</Link>
					);
				})}
				<Button
					type="button"
					variant="ghost"
					onClick={() => setOpenMobile(true)}
					className="flex h-auto min-h-12 min-w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 text-xs font-medium text-muted-foreground touch-manipulation hover:text-foreground"
					aria-label={t("store_admin_nav_more")}
				>
					<IconDots className="h-5 w-5 shrink-0" aria-hidden />
					<span className="line-clamp-1 w-full text-center leading-tight">
						{t("store_admin_nav_more")}
					</span>
				</Button>
			</div>
		</nav>
	);
}
