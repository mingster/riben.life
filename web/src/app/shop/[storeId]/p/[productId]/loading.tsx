import { getT } from "@/app/i18n";
import { Skeleton } from "@/components/ui/skeleton";

export default async function ShopProductLoading() {
	const { t } = await getT(undefined, "shop");
	return (
		<div
			className="space-y-8"
			aria-busy="true"
			aria-label={t("shop_loading_product_aria")}
		>
			<Skeleton className="h-3 w-16" />
			<div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
				<Skeleton className="aspect-4/5 w-full rounded-lg lg:aspect-square" />
				<div className="flex flex-col gap-6">
					<div className="space-y-3">
						<Skeleton className="h-10 w-full max-w-md" />
						<Skeleton className="h-6 w-32" />
					</div>
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-11 w-full max-w-xs" />
				</div>
			</div>
		</div>
	);
}
