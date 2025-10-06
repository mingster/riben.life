"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { GetMenuList } from "./admin-menu-list";

export function AdminBreadCrumb() {
	const pathname = usePathname();
	const menuGroups = GetMenuList(pathname);

	// Find the active menu and group
	let found = null as null | {
		groupLabel: string;
		menuLabel: string;
		menuHref: string;
		submenuLabel?: string;
		submenuHref?: string;
	};

	for (const group of menuGroups) {
		for (const menu of group.menus) {
			if (menu.active) {
				if (menu.submenus && menu.submenus.length > 0) {
					const activeSub = menu.submenus.find((s) => s.active);
					if (activeSub) {
						found = {
							groupLabel: group.groupLabel,
							menuLabel: menu.label,
							menuHref: menu.href,
							submenuLabel: activeSub.label,
							submenuHref: activeSub.href,
						};
						break;
					}
				}
				found = {
					groupLabel: group.groupLabel,
					menuLabel: menu.label,
					menuHref: menu.href,
				};
				break;
			}
		}
		if (found) break;
	}

	// Always start with Admin root
	return (
		<Breadcrumb className="mb-2">
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink asChild href="/sysAdmin">
						<Link href="/sysAdmin">Admin</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>
				{found && (
					<>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbLink asChild href={found.menuHref}>
								<Link href={found.menuHref}>{found.groupLabel}</Link>
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						{found.submenuLabel ? (
							<>
								<BreadcrumbItem>
									<BreadcrumbLink asChild href={found.submenuHref!}>
										<Link href={found.submenuHref!}>{found.menuLabel}</Link>
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<BreadcrumbPage>{found.submenuLabel}</BreadcrumbPage>
								</BreadcrumbItem>
							</>
						) : (
							<BreadcrumbItem>
								<BreadcrumbPage>{found.menuLabel}</BreadcrumbPage>
							</BreadcrumbItem>
						)}
					</>
				)}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
