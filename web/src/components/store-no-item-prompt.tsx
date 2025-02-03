import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

const StoreNoItemPrompt = () => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return <></>;

	return (
		<div>
			<h1 className="sm:text-xl text-2xl tracking-wider">{t("cart_noitem")}</h1>

			<Link href={"/"} className="hover:text-slate">
				<Button variant="outline" className="w-full">
					{t("keep_shopping")}
				</Button>
			</Link>
		</div>
	);
};

export default StoreNoItemPrompt;
