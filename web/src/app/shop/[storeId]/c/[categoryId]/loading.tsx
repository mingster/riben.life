import { getT } from "@/app/i18n";
import { Skeleton } from "@/components/ui/skeleton";

export default async function ShopCategoryLoading() {
	const { t } = await getT(undefined, "shop");
	return (
		<div
			className="space-y-8"
			aria-busy="true"
			aria-label={t("shop_loading_category_aria")}
		>
			<div className="space-y-2">
				<Skeleton className="h-3 w-24" />
				<Skeleton className="h-10 w-56 sm:h-12" />
			</div>
			<ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{[1, 2, 3, 4, 5, 6].map((i) => (
					<li
						key={i}
						className="overflow-hidden rounded-lg border border-border/40"
					>
						<Skeleton className="aspect-4/5 w-full rounded-none" />
						<div className="space-y-2 p-4">
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-3 w-20" />
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}
