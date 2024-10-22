"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Item } from "@/hooks/use-cart";
import type { Product } from "@/types";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { CalendarPlus2 } from "lucide-react";

import Currency from "@/components/currency";

import { ProductOptionDialog } from "./product-option-dialog";

interface ProductCardProps {
  product: Product;
  onPurchase: () => void;
  onValueChange?: (newValue: Item) => void; // return configured CartItem back to parent component
  disableBuyButton: boolean;
  className?: string;
}

export function ProductCard({
  product,
  onPurchase,
  onValueChange,
  disableBuyButton,
  className,
  ...props
}: ProductCardProps) {
  const { lng } = useI18n();
  const { t } = useTranslation(lng);

  /*
  const cart = useCart();
  const { toast } = useToast();
  //const params = useParams();
  //const {storeId, tableId} = params;
  const params = useParams<{ storeId: string; tableId: string }>();
  //  console.log("storeId", params.storeId, "tableId", params.tableId);
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
  */

  const enableBuy =
    !product.ProductAttribute?.disableBuyButton && !disableBuyButton;

  //console.log(JSON.stringify(product));

  return (
    <Card className={`${className} object-cover hover:opacity-50`} {...props}>
      <CardHeader>
        <CardTitle>
          <div className="flex gap-1 items-center">
            {product.name}
            {
              // display recurring icon if recurring
              product.ProductAttribute?.isRecurring && (
                <CalendarPlus2 className="w-4 h-4" />
              )
            }
          </div>
        </CardTitle>
        <CardDescription>{product.description}</CardDescription>
      </CardHeader>
      <CardContent className="min-h-18 max-h-36">
        <div>
          <Currency value={product.price} />
        </div>
      </CardContent>
      <CardFooter className="place-self-end">
        {enableBuy && product.ProductOptions.length > 0 ? (
          <ProductOptionDialog
            product={product}
            disableBuyButton={!enableBuy}
            //onPurchase={onPurchase}
            onValueChange={onValueChange}
          />
        ) : (
          <Button
            type="button"
            title={
              product.ProductAttribute?.isRecurring ? t("subscribe") : t("buy")
            }
            variant={"default"}
            className="w-full"
            onClick={onPurchase}
          //onClick={() => handleAddToCart(product)}
          >
            {product.ProductAttribute?.isRecurring ? t("subscribe") : t("buy")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
