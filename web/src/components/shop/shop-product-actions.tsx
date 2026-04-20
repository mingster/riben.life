"use client";

import { IconHeart } from "@tabler/icons-react";
import Link from "next/link";
import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";

interface ShopProductActionsProps {
	storeId?: string;
	productId: string;
	name: string;
	unitPrice: number;
	currency: string;
	imageUrl?: string;
	hasCustomizerGlb?: boolean;
	customizeHref?: string;
}

export function ShopProductActions({
	storeId,
	productId,
	name,
	unitPrice,
	currency,
	imageUrl,
	hasCustomizerGlb = false,
	customizeHref,
}: ShopProductActionsProps) {
	const customizeLink =
		customizeHref ??
		(storeId
			? `/shop/${storeId}/p/${productId}/customizer`
			: `/shop/p/${productId}/customizer`);
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "shop");
	const { addItem } = useCart();
	const { toggle, isSaved } = useWishlist();
	const saved = isSaved(productId);
	const wishlistLabel = saved
		? t("shop_product_remove_saved_aria")
		: t("shop_product_save_for_later_aria");

	return (
		<div className="flex flex-wrap items-center gap-2 sm:gap-3">
			<Button
				type="button"
				className="touch-manipulation"
				onClick={() =>
					addItem({
						id: productId,
						productId,
						name,
						price: unitPrice,
						currency,
						quantity: 1,
						...(imageUrl
							? { images: [{ url: imageUrl, imgPublicId: "" }] }
							: {}),
					})
				}
			>
				{t("shop_product_add_to_cart")}
			</Button>

			{hasCustomizerGlb ? (
				<Button
					variant="secondary"
					className="touch-manipulation bg-amber-800/90 hover:bg-amber-500"
					asChild
				>
					<Link href={customizeLink}>{t("shop_product_customize")}</Link>
				</Button>
			) : null}

			<Button
				type="button"
				variant="outline"
				size="icon"
				className="touch-manipulation"
				aria-pressed={saved}
				aria-label={wishlistLabel}
				title={wishlistLabel}
				onClick={() => toggle({ productId, name, imageUrl })}
			>
				<IconHeart
					className={cn("size-5", saved && "fill-primary text-primary")}
				/>
			</Button>
		</div>
	);
}
