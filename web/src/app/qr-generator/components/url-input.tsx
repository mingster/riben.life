"use client";

import { useTranslation } from "@/app/i18n/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidURL } from "@/lib/qr/generator";
import { useI18n } from "@/providers/i18n-provider";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";

interface URLInputProps {
	value: string;
	onChange: (value: string) => void;
}

export function URLInput({ value, onChange }: URLInputProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "qr-generator");

	const isValid = value === "" || value === "https://" || isValidURL(value);

	return (
		<div className="space-y-2">
			<div className="space-y-1">
				<Label htmlFor="url-input">{t("url_address_label")}</Label>
				<Input
					id="url-input"
					type="url"
					placeholder={t("url_placeholder")}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className={!isValid ? "border-destructive" : ""}
				/>
			</div>

			{value && (
				<Alert
					variant={isValid ? "default" : "destructive"}
					className="flex items-start gap-2"
				>
					{isValid ? (
						<IconCheck className="size-4 shrink-0 text-green-600" />
					) : (
						<IconAlertCircle className="size-4 shrink-0" />
					)}
					<AlertDescription className="flex-1 text-sm">
						{isValid ? t("url_valid") : t("url_invalid")}
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
