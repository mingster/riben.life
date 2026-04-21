"use client";

import type { ComponentProps } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/** Settings screens: no flex gap between tab bar and panels. */
export const adminSettingsTabsRootClass = "w-full gap-0";

/** Flush triggers, centered row, visually connects to content below. */
export const adminSettingsTabsListClass =
	"flex h-auto flex-wrap justify-center gap-0 rounded-b-none p-1";

/** Primary-colored active tab; muted inactive labels. */
export const adminSettingsTabsTriggerClass =
	"touch-manipulation rounded-md text-muted-foreground transition-[color,box-shadow,background-color] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold data-[state=active]:shadow-md data-[state=active]:ring-2 data-[state=active]:ring-ring/50";

export const adminSettingsTabsTriggerLayoutClass = "flex-1 sm:flex-none";

/** Panels sit flush under the tab list; add `className` for e.g. `space-y-4`. */
export const adminSettingsTabsContentClass = "pt-0";

export function AdminSettingsTabs({
	className,
	...props
}: ComponentProps<typeof Tabs>) {
	return (
		<Tabs className={cn(adminSettingsTabsRootClass, className)} {...props} />
	);
}

export function AdminSettingsTabsList({
	className,
	...props
}: ComponentProps<typeof TabsList>) {
	return (
		<TabsList
			className={cn(adminSettingsTabsListClass, className)}
			{...props}
		/>
	);
}

export function AdminSettingsTabsTrigger({
	className,
	...props
}: ComponentProps<typeof TabsTrigger>) {
	return (
		<TabsTrigger
			className={cn(
				adminSettingsTabsTriggerLayoutClass,
				adminSettingsTabsTriggerClass,
				className,
			)}
			{...props}
		/>
	);
}

export function AdminSettingsTabsContent({
	className,
	...props
}: ComponentProps<typeof TabsContent>) {
	return (
		<TabsContent
			className={cn(adminSettingsTabsContentClass, className)}
			{...props}
		/>
	);
}

/** Right-aligned actions row below tab content (e.g. Save). */
export function AdminSettingsTabFormFooter({
	className,
	...props
}: ComponentProps<"div">) {
	return (
		<div
			className={cn("flex justify-end gap-2 pt-2 pr-2", className)}
			{...props}
		/>
	);
}
