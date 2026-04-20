import type { ProductAttribute } from "@prisma/client";
import type { TFunction } from "i18next";

import { getT } from "@/app/i18n";
import { epochToDate } from "@/utils/datetime-utils";

interface ShopProductSpecsProps {
	attribute: ProductAttribute | null;
	/** Optional JSON object (e.g. material, lining, care). */
	specsJson?: Record<string, unknown> | null;
	className?: string;
}

function formatCm(n: number, t: TFunction): string {
	if (!Number.isFinite(n) || n <= 0) return "";
	return t("shop_product_specs_cm", { n });
}

/**
 * PDP “specs” block from `ProductAttribute` (stock, L×H×W, optional end date)
 * plus optional structured `specsJson` key/value rows (e.g. strap drop, availability window).
 */
export async function ShopProductSpecs({
	attribute,
	specsJson,
	className,
}: ShopProductSpecsProps) {
	const { t } = await getT(undefined, "shop");

	const specEntries =
		specsJson && typeof specsJson === "object" && !Array.isArray(specsJson)
			? Object.entries(specsJson).filter(
					([k, v]) =>
						k &&
						(typeof v === "string" ||
							typeof v === "number" ||
							typeof v === "boolean"),
				)
			: [];

	const len = attribute ? Number(attribute.length) : 0;
	const h = attribute ? Number(attribute.height) : 0;
	const w = attribute ? Number(attribute.width) : 0;
	const weight = attribute ? Number(attribute.weight) : 0;

	const lhwParts = [
		len > 0 ? `${t("shop_product_specs_dim_l")} ${formatCm(len, t)}` : null,
		h > 0 ? `${t("shop_product_specs_dim_h")} ${formatCm(h, t)}` : null,
		w > 0 ? `${t("shop_product_specs_dim_w")} ${formatCm(w, t)}` : null,
	].filter(Boolean);
	const hasLhw = lhwParts.length > 0;

	const end = attribute?.availableEndDate
		? epochToDate(attribute.availableEndDate)
		: null;
	const hasEndDateOnly = Boolean(end);

	let stockLine: string | null = null;
	if (attribute?.displayStockAvailability) {
		if (attribute.displayStockQuantity) {
			stockLine = t("shop_product_specs_in_stock_count", {
				count: attribute.stock,
			});
		} else if (attribute.stock > 0) {
			stockLine = t("shop_product_specs_in_stock");
		} else if (attribute.allowBackOrder) {
			stockLine = t("shop_product_specs_backorder");
		} else {
			stockLine = t("shop_product_specs_out_of_stock");
		}
	}

	if (
		!hasLhw &&
		weight <= 0 &&
		!hasEndDateOnly &&
		!stockLine &&
		!attribute?.mfgPartNumber &&
		specEntries.length === 0
	) {
		return null;
	}

	return (
		<section className={className}>
			<h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
				{t("shop_product_specs_heading")}
			</h2>
			<dl className="mt-4 space-y-3 text-sm">
				{stockLine ? (
					<div>
						<dt className="text-muted-foreground">
							{t("shop_product_specs_availability")}
						</dt>
						<dd className="mt-0.5">{stockLine}</dd>
					</div>
				) : null}
				{attribute?.mfgPartNumber ? (
					<div>
						<dt className="text-muted-foreground">
							{t("shop_product_specs_reference")}
						</dt>
						<dd className="mt-0.5 font-mono text-xs">
							{attribute.mfgPartNumber}
						</dd>
					</div>
				) : null}
				{hasLhw || weight > 0 ? (
					<div>
						<dt className="text-muted-foreground">
							{t("shop_product_specs_dimensions")}
						</dt>
						<dd className="mt-0.5">
							{hasLhw ? lhwParts.join(" × ") : null}
							{hasLhw && weight > 0 ? " · " : ""}
							{weight > 0
								? t("shop_product_specs_weight_kg", { n: weight })
								: ""}
						</dd>
					</div>
				) : null}
				{specEntries.map(([key, val]) => (
					<div key={key}>
						<dt className="text-muted-foreground">{key}</dt>
						<dd className="mt-0.5">{String(val)}</dd>
					</div>
				))}
				{hasEndDateOnly ? (
					<div>
						<dt className="text-muted-foreground">
							{t("shop_product_specs_available")}
						</dt>
						<dd className="mt-0.5">{end?.toLocaleDateString() ?? ""}</dd>
					</div>
				) : null}
			</dl>
		</section>
	);
}
