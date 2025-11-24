"use client";

import { useTranslation } from "@/app/i18n/client";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/providers/i18n-provider";
import { IconLoader, IconUpload } from "@tabler/icons-react";
import axios from "axios";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface ImportFacilityDialogProps {
	onImported?: () => void;
}

export function ImportFacilityDialog({
	onImported,
}: ImportFacilityDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [open, setOpen] = useState(false);
	const [importing, setImporting] = useState(false);
	const [backupFiles, setBackupFiles] = useState<string[]>([]);
	const [selectedFile, setSelectedFile] = useState<string>("");

	// Fetch backup file list when dialog opens
	useEffect(() => {
		if (open) {
			axios
				.get(`/api/storeAdmin/${params.storeId}/facility/list-backups`)
				.then((res) => {
					setBackupFiles(res.data.files || []);
				})
				.catch(() => setBackupFiles([]));
		}
	}, [open, params.storeId]);

	const handleImport = async () => {
		if (!selectedFile) {
			toastError({
				title: t("Error"),
				description: "Please select a backup file",
			});
			return;
		}

		setImporting(true);
		try {
			const res = await axios.post(
				`/api/storeAdmin/${params.storeId}/facility/import`,
				{
					fileName: selectedFile,
				},
			);
			if (res.data?.success) {
				toastSuccess({
					title: t("imported") || "Imported",
					description: selectedFile,
				});
				setOpen(false);
				setSelectedFile("");
				onImported?.();
			} else {
				toastError({
					title: t("import_failed") || "Import failed",
					description: res.data?.error || "Unknown error",
				});
			}
		} catch (err: unknown) {
			toastError({
				title: t("import_failed") || "Import failed",
				description: err instanceof Error ? err.message : "Unknown error",
			});
		} finally {
			setImporting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline">
					<IconUpload className="mr-0 size-4" />
					{t("import") || "Import"}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t("import") || "Import Facilities"}</DialogTitle>
					<DialogDescription>
						{t("import_facility_descr") ||
							"Select a backup file to import facilities."}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<Select value={selectedFile} onValueChange={setSelectedFile}>
						<SelectTrigger>
							<SelectValue placeholder="Select backup file" />
						</SelectTrigger>
						<SelectContent>
							{backupFiles.length === 0 ? (
								<SelectItem value="" disabled>
									No backup files found
								</SelectItem>
							) : (
								backupFiles.map((file) => (
									<SelectItem key={file} value={file}>
										{file}
									</SelectItem>
								))
							)}
						</SelectContent>
					</Select>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => setOpen(false)}
						disabled={importing}
					>
						{t("Cancel")}
					</Button>
					<Button onClick={handleImport} disabled={importing || !selectedFile}>
						{importing ? (
							<>
								<IconLoader className="mr-2 h-4 w-4 animate-spin" />
								{t("importing") || "Importing..."}
							</>
						) : (
							t("Import") || "Import"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
