"use client";

import { Heading } from "@/components/ui/heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Product, StoreProductOptionTemplate } from "@/types";
import type {
  Category,
  ProductAttribute,
  ProductCategories,
  ProductImages,
  ProductOption,
} from "@prisma/client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ProductEditAttributeTab } from "./product-edit-attribute-tab";
import { ProductEditBasicTab } from "./product-edit-basic-tab";
import { ProductEditCategoryTab } from "./product-edit-category-tab";
import { ProductEditImageTab } from "./product-edit-image-tab";

import { useTranslation } from "@/app/i18n/client";
import { AlertModal } from "@/components/modals/alert-modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useI18n } from "@/providers/i18n-provider";
import axios, { type AxiosError } from "axios";
import { Eye, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { ProductEditOptionsTab } from "./product-edit-options-tab";

interface editProps {
  initialData:
    | (Product & {
        ProductImages: ProductImages[] | [];
        ProductAttribute: ProductAttribute | null;
        ProductCategories: ProductCategories[] | [];
        ProductOptions: ProductOption[] | [];
      })
    | null;
  allCategories: Category[];
  storeOptionTemplates: StoreProductOptionTemplate[] | [];
  action: string;
}

export const ProductEditTabs = ({
  initialData,
  allCategories,
  storeOptionTemplates,
  action,
}: editProps) => {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  //console.log(`ProductEditTabs: ${JSON.stringify(initialData?.ProductCategories)}`);

  let pageTitle = t(action) + t("product");
  if (initialData) {
    pageTitle = `${pageTitle} - ${initialData?.name}`;
  }

  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(initialTab || "basic"); //show order tab by default

  const handleTabChange = (value: string) => {
    //update the state
    setActiveTab(value);
    // update the URL query parameter
    //router.push({ query: { tab: value } });
  };

  // if the query parameter changes, update the state
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);
  //console.log('selectedTab: ' + activeTab);

  const onConfirm = async () => {
    //try {
    setLoading(true);
    await axios.delete(
      `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/product/${initialData?.id}`,
    );

    toast({
      title: t("Product_deleted"),
      description: "",
      variant: "success",
    });

    window.location.assign(`/storeAdmin/${params.storeId}/products`);

    setLoading(false);
    setOpen(false);
    /*} catch (error: unknown) {
      const err = error as AxiosError;
      toast({
        title: "something wrong.",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setOpen(false);
    }*/
  };

  /*
  <ProductPreviewDialog initialData={initialData} />
*/
  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        loading={loading}
      />

      <div className="flex items-center justify-between">
        <div className="grow">
          <Heading title={pageTitle} description="" />
        </div>
        {initialData && (
          <Button
            title={t("Delete")}
            disabled={loading}
            variant="destructive"
            size="sm"
            onClick={() => setOpen(true)}
          >
            <Trash className="size-4" />
          </Button>
        )}
      </div>

      <Tabs
        value={activeTab}
        defaultValue="orders"
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger className="px-5 lg:min-w-40" value="basic">
            {t("Product_tab_basic")}
          </TabsTrigger>
          {params.productId !== "new" && (
            <>
              <TabsTrigger className="px-5 lg:min-w-40" value="categories">
                {t("Product_tab_category")}
              </TabsTrigger>

              <TabsTrigger className="px-5 lg:min-w-40" value="options">
                {t("Product_tab_options")}
              </TabsTrigger>

              <TabsTrigger className="px-5 lg:min-w-40" value="attribute">
                {t("Product_tab_attribute")}
              </TabsTrigger>

              <TabsTrigger className="px-5 lg:min-w-40" value="images">
                {t("Product_tab_images")}
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="basic">
          <ProductEditBasicTab initialData={initialData} action={action} />
        </TabsContent>

        <TabsContent value="categories">
          <ProductEditCategoryTab
            initialData={initialData?.ProductCategories}
            allCategories={allCategories}
            action={action}
          />
        </TabsContent>

        <TabsContent value="options">
          <ProductEditOptionsTab
            initialData={initialData}
            action={action}
            storeOptionTemplates={storeOptionTemplates}
          />
        </TabsContent>

        <TabsContent value="attribute">
          <ProductEditAttributeTab
            initialData={initialData?.ProductAttribute}
            action={action}
          />
        </TabsContent>

        <TabsContent value="images">
          <ProductEditImageTab
            initialData={initialData?.ProductImages}
            action={action}
          />
        </TabsContent>
      </Tabs>
    </>
  );
};
