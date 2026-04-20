"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
} from "react";

import { useTranslation } from "@/app/i18n/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ShopPlpSort } from "@/lib/shop/catalog";
import { useI18n } from "@/providers/i18n-provider";

interface ShopPlpToolbarProps {
	initialQ: string;
	initialSort: ShopPlpSort;
}

/**
 * In-page PLP filter/sort (year 1). No global search route — query stays on category URL.
 */
export function ShopPlpToolbar({ initialQ, initialSort }: ShopPlpToolbarProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "shop");
	const sortOptions = useMemo(
		() =>
			(
				[
					["new", "shop_plp_sort_new"],
					["name_asc", "shop_plp_sort_name_asc"],
					["price_asc", "shop_plp_sort_price_asc"],
					["price_desc", "shop_plp_sort_price_desc"],
				] as const
			).map(([value, key]) => ({
				value: value as ShopPlpSort,
				label: t(key),
			})),
		[t],
	);
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [pending, startTransition] = useTransition();
	const [q, setQ] = useState(initialQ);
	const [sort, setSort] = useState<ShopPlpSort>(initialSort);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		setQ(initialQ);
	}, [initialQ]);

	useEffect(() => {
		setSort(initialSort);
	}, [initialSort]);

	useEffect(() => {
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, []);

	const pushParams = useCallback(
		(patch: { q?: string; sort?: ShopPlpSort }) => {
			const p = new URLSearchParams(searchParams?.toString() ?? "");
			if (patch.q !== undefined) {
				const t = patch.q.trim();
				if (t) p.set("q", t);
				else p.delete("q");
			}
			if (patch.sort !== undefined) {
				if (patch.sort === "new") p.delete("sort");
				else p.set("sort", patch.sort);
			}

			const qs = p.toString();
			startTransition(() => {
				router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
			});
		},
		[pathname, router, searchParams],
	);

	return (
		<div
			className="flex flex-col gap-4 border-b border-border/50 pb-6 sm:flex-row sm:items-end sm:justify-between"
			aria-busy={pending}
		>
			<div className="w-full max-w-sm space-y-2">
				<Label
					htmlFor="shop-plp-q"
					className="text-xs uppercase tracking-widest"
				>
					{t("shop_plp_filter_label")}
				</Label>
				<Input
					id="shop-plp-q"
					type="search"
					placeholder={t("shop_plp_search_placeholder")}
					className="h-10 text-base sm:text-sm touch-manipulation"
					value={q}
					onChange={(e) => {
						const v = e.target.value;
						setQ(v);
						if (debounceRef.current) clearTimeout(debounceRef.current);
						debounceRef.current = setTimeout(() => pushParams({ q: v }), 300);
					}}
				/>
			</div>
			<div className="flex w-full max-w-xs flex-col gap-2 sm:w-auto">
				<Label
					htmlFor="shop-plp-sort"
					className="text-xs uppercase tracking-widest"
				>
					{t("shop_plp_sort_label")}
				</Label>
				<select
					id="shop-plp-sort"
					className="h-10 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm touch-manipulation"
					value={sort}
					onChange={(e) => {
						const v = e.target.value as ShopPlpSort;
						setSort(v);
						pushParams({ sort: v });
					}}
				>
					{sortOptions.map((o) => (
						<option key={o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}
