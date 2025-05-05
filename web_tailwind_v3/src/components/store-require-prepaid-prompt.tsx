"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

const StoreRequirePrepaidPrompt = () => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return <></>;

	return (
		<div className="flex gap-1 items-center">
			<TriangleAlert className="text-yellow-500" />
			<h1 className="sm:text-xl text-3xl tracking-wider">
				{t("store-require-prepaid-prompt")}
			</h1>
		</div>
	);
};

export default StoreRequirePrepaidPrompt;
