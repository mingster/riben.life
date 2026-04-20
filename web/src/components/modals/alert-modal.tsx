"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useI18n } from "@/providers/i18n-provider";

interface AlertModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	loading: boolean;
	/** Overrides default translated title when set */
	title?: string;
	/** Overrides default translated description when set */
	description?: string;
}

export const AlertModal: React.FC<AlertModalProps> = ({
	isOpen,
	onClose,
	onConfirm,
	loading,
	title: titleProp,
	description: descriptionProp,
}) => {
	const [isMounted, setIsMounted] = useState(false);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	if (!isMounted) {
		return null;
	}

	return (
		<Modal
			title={titleProp ?? t("alert_title")}
			description={descriptionProp ?? t("alert_descr")}
			isOpen={isOpen}
			onClose={onClose}
		>
			<div className="flex w-full items-center justify-end space-x-2 pt-6">
				<Button disabled={loading} variant="outline" onClick={onClose}>
					{t("cancel")}
				</Button>
				<Button disabled={loading} variant="destructive" onClick={onConfirm}>
					{t("confirm")}
				</Button>
			</div>
		</Modal>
	);
};
