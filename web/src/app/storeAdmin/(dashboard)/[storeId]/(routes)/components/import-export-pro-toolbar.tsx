"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useStoreAdminImportExport } from "@/hooks/use-store-admin-import-export";
import { RequiredProVersion } from "./require-pro-version";

/** Wraps import/export controls; grays out children and shows subscribe link on Free stores. */
export function ImportExportProToolbar({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	const { canImportExport } = useStoreAdminImportExport();

	return (
		<div className={cn("flex flex-col items-stretch gap-1", className)}>
			<div
				className={cn(
					"flex flex-wrap gap-1.5 sm:gap-2 sm:content-end items-center",
					!canImportExport && "opacity-50",
				)}
			>
				{children}
			</div>
			{!canImportExport && <RequiredProVersion />}
		</div>
	);
}
