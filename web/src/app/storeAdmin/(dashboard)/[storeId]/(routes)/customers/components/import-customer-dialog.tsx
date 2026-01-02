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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/providers/i18n-provider";
import { IconLoader, IconUpload } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";

interface ImportCustomerDialogProps {
	onImported?: () => void;
}

export function ImportCustomerDialog({
	onImported,
}: ImportCustomerDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [open, setOpen] = useState(false);
	const [importing, setImporting] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [selectedFileName, setSelectedFileName] = useState<string>("");

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			setSelectedFileName(file.name);
		} else {
			setSelectedFileName("");
		}
	};

	const handleImport = async () => {
		const file = fileInputRef.current?.files?.[0];
		if (!file) {
			toastError({
				title: t("error_title") || "Error",
				description: "Please select a file to import",
			});
			return;
		}

		setImporting(true);
		try {
			// Read file as base64 and send as JSON (workaround for Content-Type issues)
			const fileContent = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => {
					if (typeof reader.result === "string") {
						// Remove data:text/csv;base64, prefix if present
						const base64 = reader.result.includes(",")
							? reader.result.split(",")[1]
							: reader.result;
						resolve(base64);
					} else {
						reject(new Error("Failed to read file"));
					}
				};
				reader.onerror = reject;
				reader.readAsDataURL(file);
			});

			const res = await fetch(
				`/api/storeAdmin/${params.storeId}/customers/import`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						fileData: fileContent,
						fileName: file.name,
					}),
				},
			);

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({
					error: `HTTP ${res.status}: ${res.statusText}`,
				}));
				throw new Error(errorData.error || "Import failed");
			}

			const data = await res.json();
			if (data?.success) {
				const importedCount = data.imported || 0;
				const errorCount = data.errors?.length || 0;
				let description = `${importedCount} customer(s) imported`;
				if (errorCount > 0) {
					description += `, ${errorCount} error(s)`;
				}

				toastSuccess({
					title: t("imported") || "Imported",
					description,
				});

				// Show errors if any
				if (data.errors && data.errors.length > 0) {
					console.warn("Import errors:", data.errors);
				}

				setOpen(false);
				setSelectedFileName("");
				if (fileInputRef.current) {
					fileInputRef.current.value = "";
				}
				onImported?.();
			} else {
				toastError({
					title: t("import_failed") || "Import failed",
					description: data?.error || "Unknown error",
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
				<Button variant="outline">
					<IconUpload className="mr-0 size-4" />
					{t("import") || "Import"}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-[calc(100%-1rem)] p-4 sm:p-6 sm:max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{t("import") || "Import Customers"}</DialogTitle>
					<DialogDescription>
						{t("import_customer_descr") ||
							"Upload a CSV file to import customers. CSV columns: name (required), email (optional, auto-generated if not provided), phoneNumber (optional, must be unique if provided), creditPoint (defaults to 0, creates ledger entry if value provided), creditFiat (defaults to 0, creates ledger entry if value provided). All imported customers will have 'customer' role. Users are matched by email or phoneNumber if provided. If found, user is updated; if not found, new user is created with auto-generated email."}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="file-upload">
							{t("select_file") || "Select File"}
						</Label>
						<Input
							id="file-upload"
							ref={fileInputRef}
							type="file"
							accept=".csv,text/csv"
							onChange={handleFileChange}
							disabled={importing}
							className="cursor-pointer"
						/>
						{selectedFileName && (
							<p className="text-sm text-muted-foreground">
								{selectedFileName}
							</p>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => handleOpenChange(false)}
						disabled={importing}
					>
						{t("cancel")}
					</Button>
					<Button
						onClick={handleImport}
						disabled={importing || !selectedFileName}
					>
						{importing ? (
							<>
								<IconLoader className="mr-2 h-4 w-4 animate-spin" />
								{t("importing") || "Importing..."}
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
