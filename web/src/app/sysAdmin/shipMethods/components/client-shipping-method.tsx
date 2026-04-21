"use client";

import { IconDownload, IconLoader, IconPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { SysAdminImportJsonDialog } from "@/app/sysAdmin/components/sys-admin-import-json-dialog";
import { DataTable } from "@/components/dataTable";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import type { ShippingMethodColumn } from "../shipping-method-column";
import { createShippingMethodColumns } from "./columns";
import { EditShippingMethodDialog } from "./edit-shipping-method-dialog";

interface ShippingMethodClientProps {
	serverData: ShippingMethodColumn[];
}

const sortShippingMethods = (items: ShippingMethodColumn[]) =>
	[...items].sort((a, b) => {
		const updatedDiff =
			new Date(b.updatedAtIso).getTime() - new Date(a.updatedAtIso).getTime();
		if (updatedDiff !== 0) {
			return updatedDiff;
		}

		return (
			new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime()
		);
	});

export function ShippingMethodClient({
	serverData,
}: ShippingMethodClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "sysAdmin");
	const { t: tRoot } = useTranslation(lng);

	const [data, setData] = useState<ShippingMethodColumn[]>(() =>
		sortShippingMethods(serverData),
	);

	useEffect(() => {
		setData(sortShippingMethods(serverData));
	}, [serverData]);

	const handleCreated = useCallback((shippingMethod: ShippingMethodColumn) => {
		setData((prev) => sortShippingMethods([...prev, shippingMethod]));
	}, []);

	const handleUpdated = useCallback((shippingMethod: ShippingMethodColumn) => {
		setData((prev) => {
			const next = prev.map((item) =>
				item.id === shippingMethod.id ? shippingMethod : item,
			);
			return sortShippingMethods(next);
		});
	}, []);

	const handleDeleted = useCallback((shippingMethodId: string) => {
		setData((prev) => prev.filter((item) => item.id !== shippingMethodId));
	}, []);

	const [exporting, setExporting] = useState(false);

	const handleExport = useCallback(async () => {
		setExporting(true);
		try {
			const res = await fetch("/api/sysAdmin/shipMethods/export", {
				method: "POST",
			});

			if (!res.ok) {
				const errBody = (await res.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(errBody.error || res.statusText);
			}

			const contentDisposition = res.headers.get("content-disposition");
			let fileName = "shipping-methods-backup.json";
			if (contentDisposition) {
				const m = contentDisposition.match(/filename="([^"]+)"/);
				if (m?.[1]) {
					fileName = m[1];
				}
			}

			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = fileName;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);

			toastSuccess({
				title: tRoot("exported"),
				description: fileName,
			});
		} catch (err: unknown) {
			toastError({
				title: tRoot("export_failed"),
				description: err instanceof Error ? err.message : "Unknown error",
			});
		} finally {
			setExporting(false);
		}
	}, [tRoot]);

	const columns = useMemo(
		() =>
			createShippingMethodColumns(t, {
				onUpdated: handleUpdated,
				onDeleted: handleDeleted,
			}),
		[t, handleDeleted, handleUpdated],
	);

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title="Shipping Methods"
					badge={data.length}
					description="Manage shipping methods in this system."
				/>
				<div className="flex flex-wrap items-center gap-2">
					<Button
						type="button"
						variant="outline"
						className="h-10 sm:h-9 touch-manipulation"
						disabled={exporting}
						onClick={handleExport}
					>
						{exporting ? (
							<>
								<IconLoader className="mr-2 size-4 animate-spin" />
								<span className="text-sm sm:text-xs">{tRoot("exporting")}</span>
							</>
						) : (
							<>
								<IconDownload className="mr-2 size-4" />
								<span className="text-sm sm:text-xs">{tRoot("export")}</span>
							</>
						)}
					</Button>
					<SysAdminImportJsonDialog
						importPath="/api/sysAdmin/shipMethods/import"
						title={tRoot("import_shipping_methods")}
						description={tRoot("import_shipping_methods_descr")}
						triggerLabel={tRoot("import")}
					/>
					<EditShippingMethodDialog
						isNew
						onCreated={handleCreated}
						trigger={
							<Button
								variant="outline"
								className="h-10 sm:h-9 touch-manipulation"
							>
								<IconPlus className="mr-2 size-4" />
								<span className="text-sm sm:text-xs">{t("create")}</span>
							</Button>
						}
					/>
				</div>
			</div>
			<Separator />
			<DataTable<ShippingMethodColumn, unknown>
				data={data}
				columns={columns}
				searchKey="name"
			/>
		</>
	);
}
