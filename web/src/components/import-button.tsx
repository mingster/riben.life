"use client";

import { IconUpload } from "@tabler/icons-react";
import { useRef } from "react";
import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n-provider";
import { parseCsv } from "@/utils/import";

interface ImportButtonProps {
	onImport: (data: any) => void;
	importType?: "csv" | "json";
}

export function ImportButton({
	onImport,
	importType = "csv",
}: ImportButtonProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
			// Reset input
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		};
		reader.readAsText(file);
	};

	return (
		<>
			<input
				type="file"
				accept={importType === "csv" ? ".csv" : ".json"}
				className="hidden"
				ref={fileInputRef}
				onChange={handleFileChange}
			/>
			<Button
				variant="outline"
				className="h-10 touch-manipulation sm:h-9"
				onClick={() => fileInputRef.current?.click()}
			>
				<IconUpload className="mr-2 h-4 w-4" />
				{t("import") || "Import"}
			</Button>
		</>
	);
}
