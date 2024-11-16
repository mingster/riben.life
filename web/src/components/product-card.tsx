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

  const enableBuy =
    !product.ProductAttribute?.disableBuyButton && !disableBuyButton;

  //console.log(JSON.stringify(product));

  return (
    <Card className={`${className} object-cover hover:opacity-50`} {...props}>
      <CardHeader>
        <CardTitle>
          <div className="flex gap-1 items-center lg:text-xl">
            {product.name}
            {
              // display recurring icon if recurring
              product.ProductAttribute?.isRecurring && (
                <CalendarPlus2 className="size-4" />
              )
            }
          </div>
        </CardTitle>
        <CardDescription className="lg:text-xl text-muted-foreground">
          {product.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-18 max-h-36">
        <Currency value={product.price} />
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
