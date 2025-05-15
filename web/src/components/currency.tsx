"use client";

import { cn } from "@/utils/utils";
import type Decimal from "decimal.js";
import { useEffect, useState } from "react";

const formatter = new Intl.NumberFormat("zh-Hant", {
	style: "currency",
	currency: "TWD",
	maximumFractionDigits: 2,
	minimumFractionDigits: 0,
});

//const formatter = new Intl.NumberFormat("en"); // 1,000

interface CurrencyProps {
	value?: string | number | Decimal;
}

const Currency: React.FC<CurrencyProps> = ({ value = 0 }) => {
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	if (!isMounted) {
		return null;
	}

	return (
		<div
			className={cn(
				"font-semibold",
				Number(value) >= 0 ? "text-green-700" : "text-red-700",
			)}
		>
			{formatter.format(Number(value))}
		</div>
	);
};

export default Currency;
