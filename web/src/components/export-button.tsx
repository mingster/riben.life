"use client";

import { IconDownload } from "@tabler/icons-react";

import { useTranslation } from "@/app/i18n/client";
import { ProFeatureTooltip } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/components/require-pro-version";
import { Button } from "@/components/ui/button";
import { useStoreAdminImportExport } from "@/hooks/use-store-admin-import-export";
import { useI18n } from "@/providers/i18n-provider";
import { exportToCsv, exportToJson } from "@/utils/export";

interface ExportButtonProps {
	data: any;
	filename: string;
	exportType?: "csv" | "json";
	/** When true, show upgrade link below the button on Free stores (use on ImportButton only to avoid duplicate hints). */
	showUpgradeHint?: boolean;
}

export function ExportButton({
	data,
	filename,
	exportType = "csv",
	showUpgradeHint = false,
}: ExportButtonProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const { canImportExport } = useStoreAdminImportExport();

	const handleExport = () => {
		if (!canImportExport) return;

		if (exportType === "csv") {
			exportToCsv(filename, Array.isArray(data) ? data : [data]);
		} else {
			exportToJson(filename, data);
		}
	};

	const button = (
		<Button
			variant="outline"
			className="h-10 touch-manipulation sm:h-9"
			disabled={!canImportExport}
			onClick={handleExport}
		>
			<IconDownload className="mr-2 h-4 w-4" />
			{t(exportType === "csv" ? "export_csv" : "export") || "Export"}
		</Button>
	);

	if (!canImportExport && showUpgradeHint) {
		return <ProFeatureTooltip gated>{button}</ProFeatureTooltip>;
	}

	return button;
}
