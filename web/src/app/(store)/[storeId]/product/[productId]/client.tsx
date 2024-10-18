"use client";

import { ProductCard } from "@/app/(store)/[storeId]/components/product-card";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { useToast } from "@/components/ui/use-toast";
import { useCart } from "@/hooks/use-cart";
import { useParams } from "next/navigation";
import type { Product, StoreWithProducts } from "@/types";

export interface props {
  product: Product;
  store: StoreWithProducts;
}


export const Client: React.FC<props> = ({
  store,
  product,
}) => {

  const cart = useCart();
  const { toast } = useToast();
  const params = useParams<{ storeId: string; tableId: string }>();

  const { lng } = useI18n();
  const { t } = useTranslation(lng);

  const handleAddToCart = (product: Product) => {
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

    //router.push('/cart');

    toast({
      title: t("product_added_to_cart"),
      description: "",
      variant: "success",
    });
  };

  // http://localhost:3000/4574496e-9759-4d9c-9258-818501418747/dfc853b4-47f5-400c-a2fb-f70f045d65a0
  return (
    <>

      {product && (
        <ProductCard
          //onPurchase={() => { alert('To be implemented') }}
          onPurchase={() => handleAddToCart(product)}
          className=""
          disableBuyButton={!store.isOpen}
          product={product}
        />
      )}



    </>
  );
};
