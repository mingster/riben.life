/**
 * Parses one line from the product option “selections” textarea.
 * Format: `name:price:isDefaultFlag:imageUrlOptional`
 * - `isDefaultFlag`: `1` = default, anything else = not default
 * - `imageUrlOptional`: optional; may contain `:` (joined from remaining segments)
 */
export function parseProductOptionSelectionLine(line: string): {
	name: string;
	price: number;
	isDefault: boolean;
	imageUrl: string | null;
} {
	const tmp = line.trim();
	const parts = tmp.split(":");
	const name = parts[0]?.trim() ?? "";
	const price = Number.parseInt(parts[1]?.trim() ?? "0", 10) || 0;
	const isDefault = parts[2]?.trim() === "1";
	const imageUrl =
		parts.length > 3 ? parts.slice(3).join(":").trim() || null : null;
	return { name, price, isDefault, imageUrl };
}
