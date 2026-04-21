"use client";

import { IconLoader, IconUpload } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/providers/i18n-provider";

interface SysAdminImportJsonDialogProps {
	importPath: string;
	title: string;
	description: string;
	triggerLabel?: string;
}

export function SysAdminImportJsonDialog({
	importPath,
	title,
	description,
	triggerLabel = "Import",
}: SysAdminImportJsonDialogProps) {
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [open, setOpen] = useState(false);
	const [importing, setImporting] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [selectedFileName, setSelectedFileName] = useState("");

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		setSelectedFileName(file ? file.name : "");
	};

	const handleImport = async () => {
		const file = fileInputRef.current?.files?.[0];
		if (!file) {
			toastError({
				title: t("error"),
				description: t("select_file_first"),
			});
			return;
		}

		setImporting(true);
		try {
			const fileContent = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => {
					if (typeof reader.result === "string") {
						resolve(reader.result);
					} else {
						reject(new Error("Failed to read file"));
					}
				};
				reader.onerror = reject;
				reader.readAsDataURL(file);
			});

			const res = await fetch(importPath, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					fileData: fileContent,
					fileName: file.name,
				}),
			});

			const data = (await res.json().catch(() => ({}))) as {
				success?: boolean;
				error?: string;
				imported?: number;
			};

			if (!res.ok || !data.success) {
				throw new Error(data.error || `HTTP ${res.status}`);
			}

			toastSuccess({
				title: t("imported") || "Imported",
				description:
					typeof data.imported === "number"
						? `${data.imported} row(s)`
						: file.name,
			});
			setOpen(false);
			setSelectedFileName("");
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
			router.refresh();
		} catch (err: unknown) {
			toastError({
				title: t("import_failed") || "Import failed",
				description: err instanceof Error ? err.message : "Unknown error",
			});
		} finally {
			setImporting(false);
		}
	};

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen) {
			setSelectedFileName("");
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant="outline" className="h-10 sm:h-9 touch-manipulation">
					<IconUpload className="mr-2 size-4" />
					<span className="text-sm sm:text-xs">{triggerLabel}</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label htmlFor="sys-admin-json-import">{t("select_file")}</Label>
						<Input
							id="sys-admin-json-import"
							ref={fileInputRef}
							type="file"
							accept=".json,application/json"
							onChange={handleFileChange}
							disabled={importing}
							className="cursor-pointer"
						/>
						{selectedFileName ? (
							<p className="text-muted-foreground text-sm">
								{selectedFileName}
							</p>
						) : null}
					</div>
				</div>

				<DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<Button
						type="button"
						variant="outline"
						className="h-10 sm:h-9 touch-manipulation"
						onClick={() => handleOpenChange(false)}
						disabled={importing}
					>
						{t("cancel") || "Cancel"}
					</Button>
					<Button
						type="button"
						className="h-10 sm:h-9 touch-manipulation"
						onClick={handleImport}
						disabled={importing || !selectedFileName}
					>
						{importing ? (
							<>
								<IconLoader className="mr-2 size-4 animate-spin" />
								{t("importing") || "Importing…"}
							</>
						) : (
							t("import") || "Import"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
