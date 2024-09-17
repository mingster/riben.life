"use client";
import CartItemInfo from "@/components/cart-item-info";
import StoreNoItemPrompt from "@/components/store-no-item-prompt";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
//import { Badge } from '@mui/material';
import { useCart } from "@/hooks/use-cart";
import { ShoppingBag } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import Currency from "./currency";

export const DropdownCart = () => {
  const router = useRouter();
  const params = useParams<{ storeId: string }>();
  const { lng } = useI18n();
  const { t } = useTranslation(lng);
  const [isOpen, setIsOpen] = useState(false);

  const cart = useCart();
  const [numInCart, setNumInCart] = useState(cart.totalItems);

  function onCheckout() {
    //bring to checkout page and close the cart dropdown
    //close();
    setIsOpen(false);

    router.push(`/${params.storeId}/checkout`);
  }

  function onCart() {
    //bring to cart page and close the cart dropdown
    setIsOpen(false);
    //router.push("/cart");
  }

  useEffect(() => {
    setNumInCart(cart.totalItems);
  }, [cart.totalItems]);

  /*
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return <></>;
  */

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <strong className="relative inline-flex items-center rounded">
            {numInCart > 0 && (
              <span className="absolute -top-1 -right-2 h-5 w-5 rounded-full bg-red-800 text-slate-100 flex justify-center items-center text-xs pb-1">
                <span>{numInCart}</span>
              </span>
            )}

            <Button
              size="icon"
              className="flex-none rounded-full border-gray/20 bg-stroke/20 hover:text-meta-1
          dark:border-strokedark dark:bg-meta-4 dark:text-primary dark:hover:text-meta-1"
            >
              <ShoppingBag
                size={20}
                className="text-slate-400 hover:opacity-50 duration-300 ease-in-out w-5 h-5"
              />
            </Button>
          </strong>
        </SheetTrigger>

        <SheetTitle />
        <SheetDescription />

        <SheetContent side="right">
          <div className="overflow-y-scroll w-full px-1 grid grid-cols-1 gap-y-8 no-scrollbar">
            {cart.items.length === 0 ? (
              <StoreNoItemPrompt />
            ) : (
              <>
                <strong className="relative inline-flex items-center rounded">
                  {numInCart > 0 && (
                    <span className="absolute -top-1 -right-2 h-5 w-5 rounded-full bg-red-800 text-slate-100 flex justify-center items-center text-xs pb-1">
                      <span>{numInCart}</span>
                    </span>
                  )}
                  <Button
                    onClick={onCheckout}
                    disabled={cart.items.length === 0}
                    className="w-full"
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="grow">
                        {t("cart_dropDown_placeOrder")}
                      </div>

                      <div className="self-end">
                        <Currency value={cart.cartTotal} />
                      </div>
                    </div>
                  </Button>{" "}
                </strong>

                {/* render cart items */}
                {cart.items.map((item) => (
                  <CartItemInfo
                    key={item.id}
                    item={item}
                    showProductImg={false}
                    showQuantity={true}
                    showVarity={true}
                    showSubtotal={true}
                  />
                ))}
                {/* 管理購物車 /cart page -- no need
                <div className="w-full flex items-end justify-end">
                  <Button
                    onClick={onCart}
                    disabled={cart.items.length === 0}
                    className="text-xs"
                  >
                    {t("cart_dropDown_gotoCart")}
                  </Button>
                </div>
                */}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default DropdownCart;
