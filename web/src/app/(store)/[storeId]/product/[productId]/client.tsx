"use client";

import { useTranslation } from "@/app/i18n/client";
import { toastError, toastSuccess } from "@/components/toaster";
import { ProductCard } from "@/components/product-card";
import { type Item, useCart } from "@/hooks/use-cart";
import { useI18n } from "@/providers/i18n-provider";
import type { Product, StoreWithProducts } from "@/types";
import { useParams } from "next/navigation";

export interface props {
	product: Product;
	store: StoreWithProducts;
}

export const Client: React.FC<props> = ({ store, product }) => {
	const cart = useCart();

	const params = useParams<{ storeId: string; tableId: string }>();

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const handleAddToCart = (product: Product, newItem: Item | null) => {
		if (newItem != null) {
			// add product to cart with variants
			const test = cart.getItem(newItem.id);
			if (test) {
				cart.updateItemQuantity(newItem.id, test.quantity + 1);
			} else {
				cart.addItem(newItem, newItem?.quantity ?? 1);
			}
		} else {
			// add product to cart with no variant
			const item = cart.getItem(product.id);
			if (item) {
				cart.updateItemQuantity(product.id, item.quantity + 1);
			} else {
				cart.addItem(
					{
						id: product.id,
						name: product.name,
						price: Number(product.price),
						quantity: 1,
						storeId: params.storeId,
						tableId: params.tableId,
						//...product,
						//cartStatus: CartProductStatus.InProgress,
						//userData: "",
					},
					1,
				);
			}
		}

		//router.push('/cart');
		toastSuccess({
			title: t("product_added_to_cart"),
			description: "",
		});
	};

	// http://localhost:3000/4574496e-9759-4d9c-9258-818501418747/dfc853b4-47f5-400c-a2fb-f70f045d65a0
	return (
		<>
			{product && (
				<ProductCard
					className=""
					disableBuyButton={!store.isOpen}
					onValueChange={(newItem: Item) => {
						handleAddToCart(product, newItem);
					}}
					onPurchase={() => handleAddToCart(product, null)}
					product={product}
				/>
			)}
		</>
	);
};
