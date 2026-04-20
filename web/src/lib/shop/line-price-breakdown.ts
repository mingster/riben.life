/**
 * Snapshot of how a cart line unit price was composed (shop options + customization).
 */
export interface ShopLinePriceBreakdown {
	productBase: number;
	optionExtra: number;
	/** Present when the line includes bag customization surcharges. */
	customizationSurcharge?: number;
	unitTotal: number;
}
