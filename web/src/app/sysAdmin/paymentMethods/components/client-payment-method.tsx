"use client";

import { IconDownload, IconLoader, IconPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { SysAdminImportJsonDialog } from "@/app/sysAdmin/components/sys-admin-import-json-dialog";
import { DataTable } from "@/components/dataTable";
import { toastError, toastSuccess } from "@/components/toaster";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";
import type { PaymentMethodColumn } from "../payment-method-column";
import { createPaymentMethodColumns } from "./columns";
import { EditPaymentMethodDialog } from "./edit-payment-method-dialog";

interface PaymentMethodClientProps {
	serverData: PaymentMethodColumn[];
	/** Plugin identifiers registered in application code (e.g. stripe). */
	registeredPluginIdentifiers: string[];
	/** Installed in code but no matching `PaymentMethod.payUrl` row. */
	pluginsWithoutCatalogRow: string[];
	/** DB rows whose `payUrl` has no registered plugin implementation. */
	catalogRowsMissingPluginCode: string[];
}

const sortPaymentMethods = (items: PaymentMethodColumn[]) =>
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

export function PaymentMethodClient({
	serverData,
	registeredPluginIdentifiers,
	pluginsWithoutCatalogRow,
	catalogRowsMissingPluginCode,
}: PaymentMethodClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "sysAdmin");
	const { t: tRoot } = useTranslation(lng);

	const [data, setData] = useState<PaymentMethodColumn[]>(() =>
		sortPaymentMethods(serverData),
	);

	useEffect(() => {
		setData(sortPaymentMethods(serverData));
	}, [serverData]);

	const handleCreated = useCallback((paymentMethod: PaymentMethodColumn) => {
		setData((prev) => sortPaymentMethods([...prev, paymentMethod]));
	}, []);

	const handleUpdated = useCallback((paymentMethod: PaymentMethodColumn) => {
		setData((prev) => {
			const next = prev.map((item) =>
				item.id === paymentMethod.id ? paymentMethod : item,
			);
			return sortPaymentMethods(next);
		});
	}, []);

	const handleDeleted = useCallback((paymentMethodId: string) => {
		setData((prev) => prev.filter((item) => item.id !== paymentMethodId));
	}, []);

	const [exporting, setExporting] = useState(false);

	const handleExport = useCallback(async () => {
		setExporting(true);
		try {
			const res = await fetch("/api/sysAdmin/paymentMethods/export", {
				method: "POST",
			});

			if (!res.ok) {
				const errBody = (await res.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(errBody.error || res.statusText);
			}

			const contentDisposition = res.headers.get("content-disposition");
			let fileName = "payment-methods-backup.json";
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

	const registeredPluginIds = useMemo(
		() =>
			new Set(registeredPluginIdentifiers.map((id) => id.trim().toLowerCase())),
		[registeredPluginIdentifiers],
	);

	const columns = useMemo(
		() =>
			createPaymentMethodColumns(t, {
				onUpdated: handleUpdated,
				onDeleted: handleDeleted,
				registeredPluginIds,
			}),
		[t, handleDeleted, handleUpdated, registeredPluginIds],
	);

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title="Payment Methods"
					badge={data.length}
					description="Manage payment methods in this system."
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
						importPath="/api/sysAdmin/paymentMethods/import"
						title={tRoot("import_payment_methods")}
						description={tRoot("import_payment_methods_descr")}
						triggerLabel={tRoot("import")}
					/>
					<EditPaymentMethodDialog
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
			{pluginsWithoutCatalogRow.length > 0 ? (
				<Alert
					variant="default"
					className="border-amber-500/50 bg-amber-500/10"
				>
					<AlertTitle>Plugins without catalog row</AlertTitle>
					<AlertDescription className="text-sm">
						These processors are registered in code but have no matching
						<code className="mx-1 rounded bg-muted px-1">PaymentMethod</code>
						row (add one or import JSON):{" "}
						<span className="font-mono">
							{pluginsWithoutCatalogRow.join(", ")}
						</span>
					</AlertDescription>
				</Alert>
			) : null}
			{catalogRowsMissingPluginCode.length > 0 ? (
				<Alert variant="destructive">
					<AlertTitle>Catalog rows without plugin code</AlertTitle>
					<AlertDescription className="text-sm">
						Add a plugin module and register it for:{" "}
						<span className="font-mono">
							{catalogRowsMissingPluginCode.join("; ")}
						</span>
					</AlertDescription>
				</Alert>
			) : null}
			<Separator />
			<DataTable<PaymentMethodColumn, unknown>
				data={data}
				columns={columns}
				searchKey="name"
			/>
		</>
	);
}
