"use client";

import { ProductCard } from "@/app/(store)/[storeId]/components/product-card";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { useToast } from "@/components/ui/use-toast";
import { useCart } from "@/hooks/use-cart";
import { useParams } from "next/navigation";

import type { Category, Product, Store } from "@/types";
import type { ProductCategories } from "./page";

export interface props {
  category: Category;
  store: Store;
}

// store home page.
// if store is opened (according to business hours), display menu (categorized products), and seating status (take off/in store).
//
export const Client: React.FC<props> = ({ store, category }) => {
  /*
  const session = useSession();
  //const { toast } = useToast();
  //const router = useRouter();

  //const [type, setType] = useState<string>('monthly');
  //const [price, setPrice] = useState<number>(12.95);
  //const stripePromise = getStripe();
  //const [order, setOrder] = useState<StoreOrder>();
  const params = useParams<{ storeId: string }>();
  */

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
      {(category.ProductCategories as ProductCategories[])?.map((pc) => (
        <ProductCard
          key={pc.Product.id}
          className="lg:min-w-[220px]"
          onPurchase={() => handleAddToCart(pc.Product)}
          disableBuyButton={!store.isOpen}
          product={{
            ...pc.Product,
          }}
        />
      ))}
    </>
  );
};
