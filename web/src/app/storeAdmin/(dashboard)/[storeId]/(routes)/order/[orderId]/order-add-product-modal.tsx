"use client";
import { X } from "lucide-react";
import * as React from "react";

import { useTranslation } from "@/app/i18n/client";
import { ProductCard } from "@/components/product-card";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { type Item, useCart } from "@/hooks/use-cart";
import { cn, getAbsoluteUrl } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import type {
  Category,
  Product,
  ProductCategories,
  StoreOrder,
  StoreWithProductNCategories,
} from "@/types";
import { OrderStatus, ProductStatus } from "@/types/enum";
import type { orderitemview } from "@prisma/client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import Decimal from "decimal.js";
import { useParams } from "next/navigation";
import ScrollSpy from "react-ui-scrollspy";

export interface props {
  store: StoreWithProductNCategories;
  order: StoreOrder | null; // when null, create new order
  openModal: boolean;
  onModalClose: () => void;
  onValueChange?: (newValue: orderitemview[]) => void;
}

// store home page.
// if store is opened (according to business hours), display menu (categorized products), and seating status (take off/in store).
//
export const OrderAddProductModal: React.FC<props> = ({
  store,
  order,
  openModal,
  onModalClose,
  onValueChange,
}) => {
  const cart = useCart();
  const { toast } = useToast();
  const params = useParams<{ storeId: string }>();

  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");
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

  // called when user click Add button in ProductCard
  const handleAddToOrder = (product: Product, newItem: Item | null) => {
    if (!order) {
      console.log("create new order");

      return;
    }

    const result: orderitemview[] = [];

    if (newItem) {
      // add the product with variants
      result.push({
        productId: product.id,
        quantity: newItem.quantity,
        unitPrice: new Decimal(newItem.price),
        unitDiscount: new Decimal(0),
        name: newItem.name,
        id: newItem.id,
        url: null,
        orderId: order.id,
        variants: newItem.variants,
        variantCosts: newItem.variantCosts,
      });
    } else {
      // add the product with no variant
      result.push({
        productId: product.id,
        quantity: 1,
        unitPrice: product.price,
        unitDiscount: new Decimal(0),
        name: product.name,
        id: "",
        url: null,
        orderId: order.id,
        variants: null,
        variantCosts: null,
      });
    }

    onValueChange?.(result);

    toast({
      title: t("Order_add_product_modal_updated"),
      description: "",
      variant: "success",
    });
  };

  const onClose = () => {
    openModal = false;
    onModalClose();
  };
  const onChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  // http://localhost:3000/4574496e-9759-4d9c-9258-818501418747/dfc853b4-47f5-400c-a2fb-f70f045d65a0
  return (
    <>
      <CustomDialog open={openModal} onOpenChange={onChange}>
        <DialogTitle> </DialogTitle>
        <DialogDescription> </DialogDescription>

        <DialogContent
          className={"max-w-[calc(80vh)] overflow-y-scroll max-h-screen"}
        >
          <div className="grid grid-cols-[20%_80%] gap-2">
            <div className="self-start sticky top-24">
              {/* 20% sidebar */}
              <ScrollArea className="w-full max-h-fit whitespace-nowrap">
                <div className="items-center space-x-1">
                  {store.Categories.map((category: Category) => (
                    <a
                      key={category.id}
                      onClick={(e) => onNavlinkClick(e)}
                      href={`${getAbsoluteUrl()}/${store.id}#${category.id}`}
                    >
                      <div
                        data-to-scrollspy-id={category.id}
                        className={"ss-item"}
                      >
                        {category.name}
                      </div>
                    </a>
                  ))}
                </div>{" "}
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            </div>

            <div className="">
              <ScrollSpy scrollThrottle={100} useBoxMethod={false}>
                {store.Categories?.map((category: Category) => (
                  <div key={category.id} id={category.id} className="">
                    <div className="text-center w-full">
                      <div className="font-bold">{category.name}</div>
                    </div>
                    <div className="pb-10">
                      {(category.ProductCategories as ProductCategories[])?.map(
                        (pc) =>
                          pc.Product.status === ProductStatus.Published && (
                            <ProductCard
                              key={pc.Product.id}
                              className=""
                              disableBuyButton={!store.isOpen}
                              onValueChange={(newItem: Item) => {
                                handleAddToOrder(pc.Product, newItem);
                              }}
                              onPurchase={() =>
                                handleAddToOrder(pc.Product, null)
                              }
                              product={{
                                ...pc.Product,
                                //ProductImages: pc.Product.ProductImages,
                                //ProductAttribute: pc.Product.ProductAttribute,
                              }}
                            />
                          ),
                      )}
                    </div>
                  </div>
                ))}
              </ScrollSpy>
            </div>
          </div>
        </DialogContent>
      </CustomDialog>
    </>
  );
};

const CustomDialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));

DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
