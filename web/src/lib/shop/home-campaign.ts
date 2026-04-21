/**
 * Optional marketing blocks on `/shop` — set `NEXT_PUBLIC_SHOP_HOME_BLOCKS` to a JSON array:
 * `[{"title":"...","body":"...","href":"/shop/c/...","cta":"Shop"}]`
 */
export interface ShopHomeBlock {
	title: string;
	body: string;
	href?: string;
	cta?: string;
}

export function parseShopHomeBlocksFromEnv(): ShopHomeBlock[] {
	const raw = process.env.NEXT_PUBLIC_SHOP_HOME_BLOCKS;
	if (!raw || raw.trim() === "") {
		return [];
	}
	try {
		const v: unknown = JSON.parse(raw);
		if (!Array.isArray(v)) {
			return [];
		}
		const out: ShopHomeBlock[] = [];
		for (const item of v) {
			if (typeof item !== "object" || item === null) {
				continue;
			}
			const o = item as Record<string, unknown>;
			const title = typeof o.title === "string" ? o.title : "";
			const body = typeof o.body === "string" ? o.body : "";
			if (!title || !body) {
				continue;
			}
			out.push({
				title,
				body,
				href: typeof o.href === "string" ? o.href : undefined,
				cta: typeof o.cta === "string" ? o.cta : undefined,
			});
		}
		return out;
	} catch {
		return [];
	}
}
