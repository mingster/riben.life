"use client";

import { useTranslation } from "@/app/i18n/client";
import { ProductCard } from "@/components/product-card";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { useCart } from "@/hooks/use-cart";
import { getAbsoluteUrl } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import type {
  Category,
  Product,
  ProductCategories,
  StoreWithProductNCategories,
} from "@/types";
import { ProductStatus } from "@/types/enum";
import { formatDate } from "date-fns";
import { ArrowUpToLine } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ScrollSpy from "react-ui-scrollspy";

export interface props {
  store: StoreWithProductNCategories;
  openModal: boolean;
  onModalClose: () => void;
}

// store home page.
// if store is opened (according to business hours), display menu (categorized products), and seating status (take off/in store).
//
export const OrderAddProductModal: React.FC<props> = ({
  store,
  openModal,
  onModalClose,
}) => {
  const cart = useCart();
  const { toast } = useToast();
  const params = useParams<{ storeId: string }>();

  const { lng } = useI18n();
  const { t } = useTranslation(lng);
  // scroll spy nav click
  const onNavlinkClick = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
  ) => {
    e.preventDefault();
    const target = window.document.getElementById(
      e.currentTarget.href.split("#")[1],
    );
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

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
    <div className=" fixed left-0 top-0 w-full h-full bg-black bg-opacity-80 flex justify-center items-center">
      <div className=" bg-slate-50 p-5 shadow-md shadow-stone-400 flex flex-col gap-3">
        {/* scroll up to top */}
        <div className="relative flex w-full justify-center align-top">
          <button
            className="pt-0 pl-2"
            type="button"
            title="scroll up to top"
            onClick={(e) => {
              e.preventDefault();
              const target = window.document.getElementById("top");
              if (target) {
                target.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            <ArrowUpToLine className="w-[20px] h-[20px]" />
          </button>
        </div>

        <button
          type="button"
          className=" border-4 bg-slate-400"
          onClick={onModalClose}
        >
          關閉
        </button>
      </div>
    </div>
  );
};
