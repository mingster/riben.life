"use client";

import {
	IconCalendar,
	IconClock,
	IconDots,
	IconShoppingCart,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Store } from "@/types";

import { buildCustomerPrimaryNavItems } from "./store-menu-primary-actions";

const iconMap = {
	order: IconShoppingCart,
	rsvp: IconCalendar,
	waitlist: IconClock,
} as const;

interface LiffCustomerBottomBarProps {
	store: Store & {
		rsvpSettings?: { acceptReservation?: boolean | null } | null;
		waitListSettings?: { enabled?: boolean | null } | null;
	};
	customerNavPrefix: string;
	onOpenMenu: () => void;
	t: (key: string) => string;
	className?: string;
}

function LiffCustomerBottomBarInner({
	store,
	customerNavPrefix,
	onOpenMenu,
	t,
	className,
}: LiffCustomerBottomBarProps) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const isInLiffShell = pathname.startsWith("/liff/");

	if (!isInLiffShell) {
		return null;
	}

	const items = buildCustomerPrimaryNavItems({
		navPrefix: customerNavPrefix,
		pathname,
		store,
		searchParams,
		labels: {
			order: t("online_order"),
			rsvp: t("reservation"),
			waitlist: t("waiting_list"),
		},
	});

	return (
		<nav
			className={cn(
				"border-t bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/85",
				className,
			)}
			aria-label={t("liff_nav_landmark")}
		>
			<div className="flex min-h-14 items-stretch justify-between gap-0.5 px-1 pt-1">
				{items.map((item) => {
					const Icon = iconMap[item.id];
					const inactiveClass = item.active
						? "bg-primary/10 text-primary"
						: "text-muted-foreground hover:text-foreground";
					if (!item.enabled) {
						return (
							<span
								key={item.id}
								className={cn(
									"flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 text-xs font-medium touch-manipulation",
									"cursor-not-allowed opacity-40",
								)}
								aria-disabled="true"
							>
								<Icon className="h-5 w-5 shrink-0" aria-hidden />
								<span className="line-clamp-2 w-full text-center leading-tight">
									{item.label}
								</span>
							</span>
						);
					}
					return (
						<Link
							key={item.id}
							href={item.href}
							className={cn(
								"flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 text-xs font-medium touch-manipulation",
								inactiveClass,
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
					onClick={onOpenMenu}
					className="flex h-auto min-h-12 min-w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 text-xs font-medium text-muted-foreground touch-manipulation hover:text-foreground"
					aria-label={t("liff_nav_more")}
				>
					<IconDots className="h-5 w-5 shrink-0" aria-hidden />
					<span className="line-clamp-1 w-full text-center leading-tight">
						{t("liff_nav_more")}
					</span>
				</Button>
			</div>
		</nav>
	);
}

/** Mobile LIFF bottom nav: primary links + More (sheet menu). */
export function LiffCustomerBottomBar(props: LiffCustomerBottomBarProps) {
	return (
		<Suspense fallback={null}>
			<LiffCustomerBottomBarInner {...props} />
		</Suspense>
	);
}
