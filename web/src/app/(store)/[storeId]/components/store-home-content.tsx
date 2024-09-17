"use client";

import { ProductCard } from "@/components/product-card";
import type { Category } from "@/types";
import { Prisma, type StoreTables } from "@prisma/client";
import { ArrowUpToLine } from "lucide-react";
import type { StoreWithProductNCategories } from "../page";

import { useTranslation } from "@/app/i18n/client";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import BusinessHours from "@/lib/businessHours";
import { getAbsoluteUrl } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import { ProductStatus } from "@/types/enum";
import type { StoreSettings } from "@prisma-mongo/prisma/client";
import ScrollSpy from "react-ui-scrollspy";

const prodCategoryObj = Prisma.validator<Prisma.ProductCategoriesDefaultArgs>()(
  {
    include: {
      Product: {
        include: {
          ProductImages: true,
          ProductAttribute: true,
          ProductOptions: {
            include: {
              ProductOptionSelections: true,
            },
          },
          ProductCategories: true,
        },
      },
    },
  },
);
export type ProductCategories = Prisma.ProductCategoriesGetPayload<
  typeof prodCategoryObj
>;

/*
  <Image
  alt=""
  src="/images/placeholder-image.webp"
  width={240}
  height={240}
  />
*/

export interface props {
  storeData: StoreWithProductNCategories;
  mongoData: StoreSettings;
  tableData?: StoreTables;
}

// store home page.
export const StoreHomeContent: React.FC<props> = ({
  storeData,
  mongoData,
  tableData,
}) => {
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

  const { lng } = useI18n();
  const { t } = useTranslation(lng);

  //console.log(JSON.stringify(storeData.isOpen));
  /*
<section className="mx-auto flex flex-col max-w-[980px] items-center gap-2 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-6 content-center">
</section>

  const onPress = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    e.preventDefault();
    const target = window.document.getElementById(
      e.currentTarget.href.split("#")[1],
    );
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  */

  let isStoreOpen = storeData.isOpen;
  if (storeData.useBusinessHours && mongoData.businessHours !== null) {
    const bizHour = mongoData.businessHours;
    const businessHours = new BusinessHours(bizHour);
    isStoreOpen = businessHours.isOpenNow();
    //const nextOpeningDate = businessHours.nextOpeningDate();
    //const nextOpeningHour = businessHours.nextOpeningHour();

    //console.log(JSON.stringify(bizHour));
    //console.log(`isOpenNow: ${businessHours.isOpenNow()}`);
    //console.log(`nextOpeningDate: ${businessHours.nextOpeningDate(true)}`);
    //console.log(`nextOpeningHour: ${businessHours.nextOpeningHour()}`);
    //console.log(`isOnHoliday: ${businessHours.isOnHoliday(new Date())}`);
  }

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

  if (!isStoreOpen) {
    return t("store_closed");
  }

  return (
    <section className="relative w-full justify-center content-center items-center">
      <div className="pl-1 pr-1">
        {!storeData.isOpen && <h2>{t("store_closed")}</h2>}
        {tableData && (
          <h3>
            {t("storeTables")}: {tableData.tableName}
          </h3>
        )}

        {mongoData.orderNoteToCustomer && (
          <div>
            <pre>{mongoData.orderNoteToCustomer}</pre>
          </div>
        )}

        <div className="grid grid-cols-[20%_80%] gap-2">
          <div className="self-start sticky top-24">
            {/* 20% sidebar */}
            <ScrollArea className="w-full max-h-fit whitespace-nowrap">
              <div className="items-center space-x-1">
                {storeData.Categories.map((category: Category) => (
                  <a
                    key={category.id}
                    onClick={(e) => onNavlinkClick(e)}
                    href={`${getAbsoluteUrl()}/${storeData.id}#${category.id}`}
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
              {storeData.Categories?.map((category: Category) => (
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
                            disableBuyButton={!storeData.isOpen}
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
      </div>
    </section>
  );
};
