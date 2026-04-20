import { getT } from "@/app/i18n";
import { Skeleton } from "@/components/ui/skeleton";

export default async function ShopLoading() {
	const { t } = await getT(undefined, "shop");
	return (
		<div
			className="space-y-8"
			aria-busy="true"
			aria-label={t("shop_loading_shop_aria")}
		>
			<div className="space-y-2">
				<Skeleton className="h-3 w-28 rounded-none" />
				<Skeleton className="h-10 w-40 sm:h-12 sm:w-48" />
				<Skeleton className="h-4 w-full max-w-xl" />
			</div>
			<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{[1, 2, 3, 4, 5, 6].map((i) => (
					<li key={i}>
						<Skeleton className="h-36 rounded-lg sm:h-40" />
					</li>
				))}
			</ul>
		</div>
	);
}
