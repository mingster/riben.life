"use client";

import { buildCustomerPrimaryNavItems } from "./store-menu-primary-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Store } from "@/types";
import { IconClock, IconDots } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const iconMap = {
	waitlist: IconClock,
} as const;

interface LiffCustomerBottomBarProps {
	store: Store;
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
			waiting_list: t("waiting_list"),
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

/**
 * Mobile / narrow LIFF bottom navigation: primary links from store flags + More (full sheet menu).
 */
export function LiffCustomerBottomBar(props: LiffCustomerBottomBarProps) {
	return (
		<Suspense fallback={null}>
			<LiffCustomerBottomBarInner {...props} />
		</Suspense>
	);
}
