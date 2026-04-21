import Link from "next/link";
import { Suspense } from "react";

import { getT } from "@/app/i18n";
import { GlobalNavbar } from "@/components/global-navbar";
import { Loader } from "@/components/loader";
import { Button } from "@/components/ui/button";

export default async function ShopNoStorePage() {
	const { t } = await getT(undefined, "shop");
	const title = t("shop_no_store_title");

	return (
		<Suspense fallback={<Loader />}>
			<div className="min-h-screen">
				<GlobalNavbar title={title} />
				<div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
					<h1 className=" text-2xl font-light tracking-tight text-foreground">
						{title}
					</h1>
					<p className="mt-4 text-sm leading-relaxed text-muted-foreground">
						{t("shop_no_store_body")}
					</p>
					<Button asChild className="mt-8 touch-manipulation" variant="outline">
						<Link href="/">{t("shop_no_store_back_home")}</Link>
					</Button>
				</div>
			</div>
		</Suspense>
	);
}
