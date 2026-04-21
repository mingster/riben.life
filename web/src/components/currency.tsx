"use client";

import type Decimal from "decimal.js";
import { createElement, type ElementType } from "react";

import { formatCurrencyAmount, intlLocaleFromAppLang } from "@/lib/intl-locale";
import { cn } from "@/lib/utils";

interface CurrencyProps {
	value?: string | number | Decimal;
	/** ISO 4217 code, e.g. `twd`, `USD`. Defaults to `TWD`. */
	currency?: string;
	/** App language (`tw` | `en` | `jp`) — picks an Intl locale. Ignored if `locale` is set. */
	lng?: string;
	/** BCP 47 locale override (e.g. `en-US`). */
	locale?: string;
	className?: string;
	/** Green/red + semibold (cart). Off for catalog / muted prices. */
	colored?: boolean;
	as?: ElementType;
}

export default function Currency({
	value = 0,
	currency = "TWD",
	lng,
	locale: localeProp,
	className,
	colored = true,
	as: Tag = "div",
}: CurrencyProps) {
	const num = Number(value);
	const locale = localeProp ?? (lng ? intlLocaleFromAppLang(lng) : "zh-Hant");
	const text = formatCurrencyAmount(num, currency, locale);

	return createElement(
		Tag,
		{
			className: cn(
				colored && (num >= 0 ? "text-green-700" : "text-red-700"),
				colored && "font-semibold",
				className,
			),
		},
		text,
	);
}
