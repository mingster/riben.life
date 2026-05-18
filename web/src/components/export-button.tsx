"use client";

import { IconDownload } from "@tabler/icons-react";

import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n-provider";
import { exportToCsv, exportToJson } from "@/utils/export";

interface ExportButtonProps {
	data: any;
	filename: string;
	exportType?: "csv" | "json";
}

export function ExportButton({
	data,
	filename,
	exportType = "csv",
}: ExportButtonProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const handleExport = () => {
		if (exportType === "csv") {
			exportToCsv(filename, Array.isArray(data) ? data : [data]);
		} else {
			exportToJson(filename, data);
		}
	};

	return (
		<Button
			variant="outline"
			className="h-10 touch-manipulation sm:h-9"
			onClick={handleExport}
		>
			<IconDownload className="mr-2 h-4 w-4" />
			{t(exportType === "csv" ? "export_csv" : "export") || "Export"}
		</Button>
	);
}
