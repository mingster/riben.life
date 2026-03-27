"use client";

import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadQRCode } from "@/lib/qr/generator";
import { useI18n } from "@/providers/i18n-provider";
import { IconDownload } from "@tabler/icons-react";
import { useState } from "react";

interface DownloadButtonProps {
	blob: Blob | null;
	disabled?: boolean;
}

export function DownloadButton({ blob, disabled }: DownloadButtonProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "qr-generator");

	const [open, setOpen] = useState(false);
	const [filename, setFilename] = useState("qrcode");

	const handleDownload = () => {
		if (!blob) return;

		const finalFilename = filename.endsWith(".png")
			? filename
			: `${filename}.png`;

		downloadQRCode(blob, finalFilename);
		setOpen(false);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="lg" disabled={disabled || !blob} className="w-full">
					<IconDownload className="mr-2 size-5" />
					{t("download_button")}
				</Button>
			</DialogTrigger>

			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("download_dialog_title")}</DialogTitle>
					<DialogDescription>
						{t("download_dialog_description")}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="filename">{t("download_filename_label")}</Label>
						<div className="flex gap-2">
							<Input
								id="filename"
								value={filename}
								onChange={(e) => setFilename(e.target.value)}
								placeholder={t("download_filename_placeholder")}
							/>
							<span className="flex items-center text-sm text-muted-foreground">
								.png
							</span>
						</div>
					</div>

					<div className="flex gap-2">
						<Button onClick={handleDownload} className="flex-1">
							{t("download_confirm")}
						</Button>
						<Button
							variant="outline"
							onClick={() => setOpen(false)}
							className="flex-1"
						>
							{t("download_cancel")}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
