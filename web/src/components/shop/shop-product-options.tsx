"use client";

import Image from "next/image";
import { useCallback, useMemo } from "react";

import { useTranslation } from "@/app/i18n/client";
import { Label } from "@/components/ui/label";
import { formatCurrencyAmount, intlLocaleFromAppLang } from "@/lib/intl-locale";
import type { ShopOptionSelectionRow } from "@/lib/shop/option-selections";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";

export interface ShopOptionPayload {
	id: string;
	optionName: string;
	isRequired: boolean;
	isMultiple: boolean;
	minSelection: number;
	maxSelection: number;
	sortOrder: number;
	selections: {
		id: string;
		name: string;
		price: number;
		isDefault: boolean;
		imageUrl?: string | null;
	}[];
}

interface ShopProductOptionsProps {
	options: ShopOptionPayload[];
	value: ShopOptionSelectionRow[];
	onChange: (next: ShopOptionSelectionRow[]) => void;
	disabled?: boolean;
	/** Product/store ISO 4217 code for option surcharges. */
	productCurrency?: string;
}

function rowsFromOptions(
	options: ShopOptionPayload[],
): ShopOptionSelectionRow[] {
	return [...options]
		.sort((a, b) => a.sortOrder - b.sortOrder)
		.map((opt) => {
			const defs = opt.selections.filter((s) => s.isDefault);
			let selectionIds = defs.map((s) => s.id);
			if (selectionIds.length === 0 && opt.selections.length === 1) {
				selectionIds = [opt.selections[0].id];
			}
			return { optionId: opt.id, selectionIds };
		});
}

export function buildInitialShopSelections(
	options: ShopOptionPayload[],
): ShopOptionSelectionRow[] {
	return rowsFromOptions(options);
}

export function ShopProductOptions({
	options,
	value,
	onChange,
	disabled,
	productCurrency = "twd",
}: ShopProductOptionsProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "shop");
	const priceLocale = intlLocaleFromAppLang(lng);
	const sorted = useMemo(
		() => [...options].sort((a, b) => a.sortOrder - b.sortOrder),
		[options],
	);

	const updateOption = useCallback(
		(optionId: string, selectionIds: string[]) => {
			const next = value.map((r) =>
				r.optionId === optionId ? { optionId, selectionIds } : r,
			);
			if (!next.some((r) => r.optionId === optionId)) {
				next.push({ optionId, selectionIds });
			}
			onChange(next);
		},
		[value, onChange],
	);

	const toggleMulti = useCallback(
		(opt: ShopOptionPayload, selectionId: string) => {
			const row = value.find((r) => r.optionId === opt.id);
			const current = row?.selectionIds ?? [];
			const max =
				opt.maxSelection > 0 ? opt.maxSelection : opt.selections.length;
			const has = current.includes(selectionId);
			let nextIds: string[];
			if (has) {
				nextIds = current.filter((id) => id !== selectionId);
			} else {
				if (current.length >= max) return;
				nextIds = [...current, selectionId];
			}
			updateOption(opt.id, nextIds);
		},
		[value, updateOption],
	);

	if (sorted.length === 0) return null;

	return (
		<div className="space-y-6">
			<p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
				{t("shop_product_options_section_title")}
			</p>
			{sorted.map((opt) => {
				const row = value.find((r) => r.optionId === opt.id);
				const selected = row?.selectionIds ?? [];

				return (
					<div key={opt.id} className="space-y-2">
						<Label className="text-sm font-medium">
							{opt.optionName}
							{opt.isRequired ? (
								<span className="text-destructive"> *</span>
							) : null}
						</Label>
						{opt.isMultiple ? (
							<ul className="flex flex-wrap gap-2">
								{opt.selections.map((s) => {
									const on = selected.includes(s.id);
									return (
										<li key={s.id}>
											<button
												type="button"
												disabled={disabled}
												onClick={() => toggleMulti(opt, s.id)}
												className={cn(
													"inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors touch-manipulation",
													on
														? "border-foreground bg-foreground text-background"
														: "border-border/80 bg-background hover:border-foreground/40",
												)}
											>
												{s.imageUrl ? (
													<span className="relative size-5 shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted">
														<Image
															src={s.imageUrl}
															alt=""
															fill
															className="h-full w-full max-w-none object-cover"
															sizes="20px"
														/>
													</span>
												) : null}
												{s.name}
												{Number(s.price) > 0 ? (
													<span className="ml-1 text-muted-foreground">
														+
														{formatCurrencyAmount(
															Number(s.price),
															productCurrency,
															priceLocale,
														)}
													</span>
												) : null}
											</button>
										</li>
									);
								})}
							</ul>
						) : (
							<select
								disabled={disabled}
								className="h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-base sm:text-sm touch-manipulation"
								value={selected[0] ?? ""}
								onChange={(e) => {
									const v = e.target.value;
									updateOption(opt.id, v ? [v] : []);
								}}
							>
								{!opt.isRequired && (
									<option value="">
										{t("shop_product_option_select_placeholder")}
									</option>
								)}
								{opt.selections.map((s) => (
									<option key={s.id} value={s.id}>
										{s.name}
										{Number(s.price) > 0
											? ` (+${formatCurrencyAmount(Number(s.price), productCurrency, priceLocale)})`
											: ""}
									</option>
								))}
							</select>
						)}
					</div>
				);
			})}
		</div>
	);
}
