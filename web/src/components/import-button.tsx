"use client";

import { IconUpload } from "@tabler/icons-react";
import { useRef } from "react";
import { useTranslation } from "@/app/i18n/client";
import { ProFeatureTooltip } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/components/require-pro-version";
import { Button } from "@/components/ui/button";
import { useStoreAdminImportExport } from "@/hooks/use-store-admin-import-export";
import { useI18n } from "@/providers/i18n-provider";
import { parseCsv } from "@/utils/import";

interface ImportButtonProps {
	onImport: (data: any) => void;
	importType?: "csv" | "json";
	/** When true (default), show upgrade link below the button on Free stores. */
	showUpgradeHint?: boolean;
}

export function ImportButton({
	onImport,
	importType = "csv",
	showUpgradeHint = true,
}: ImportButtonProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const { canImportExport } = useStoreAdminImportExport();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!canImportExport) return;

		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			try {
				const result = event.target?.result as string;
				if (importType === "csv") {
					const parsed = parseCsv(result);
					onImport(parsed);
				} else {
					const parsed = JSON.parse(result);
					onImport(parsed);
				}
			} catch (error) {
				console.error("Error parsing file", error);
				alert(t("import_failed") || "Import failed");
			}
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		};
		reader.readAsText(file);
	};

	const controls = (
		<>
			<input
				type="file"
				accept={importType === "csv" ? ".csv" : ".json"}
				className="hidden"
				ref={fileInputRef}
				onChange={handleFileChange}
				disabled={!canImportExport}
			/>
			<Button
				variant="outline"
				className="h-10 touch-manipulation sm:h-9"
				disabled={!canImportExport}
				onClick={() => {
					if (canImportExport) {
						fileInputRef.current?.click();
					}
				}}
			>
				<IconUpload className="mr-2 h-4 w-4" />
				{t("import") || "Import"}
			</Button>
		</>
	);

	if (!canImportExport && showUpgradeHint) {
		return <ProFeatureTooltip gated>{controls}</ProFeatureTooltip>;
	}

	return <div className="flex flex-col items-stretch gap-1">{controls}</div>;
}
