"use client";

import { ProductCard } from "@/app/(store)/[storeId]/components/product-card";
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
import Link from "next/link";
import { formatDate } from "date-fns";

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
// if store is opened (according to business hours), display menu (categorized products), and seating status (take off/in store).
//
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

  let closed_descr = "";
  let isStoreOpen = storeData.isOpen;

  //使用所設定的時間來判斷是否營業。若關閉，只會依照「店休/營業中」的設定。
  if (storeData.useBusinessHours && mongoData.businessHours !== null) {
    // determine store is open using business hour setting
    const bizHour = mongoData.businessHours;
    const businessHours = new BusinessHours(bizHour);
    isStoreOpen = businessHours.isOpenNow();

    const nextOpeningDate = businessHours.nextOpeningDate();
    const nextOpeningHour = businessHours.nextOpeningHour();

    closed_descr = `${formatDate(nextOpeningDate, "yyyy-MM-dd")} ${nextOpeningHour}`;

    //const nextOpeningDate = businessHours.nextOpeningDate();
    //const nextOpeningHour = businessHours.nextOpeningHour();

    //console.log(JSON.stringify(bizHour));
    //console.log(`isOpenNow: ${businessHours.isOpenNow()}`);
    //console.log(`nextOpeningDate: ${businessHours.nextOpeningDate(true)}`);
    //console.log(`nextOpeningHour: ${businessHours.nextOpeningHour()}`);
    //console.log(`isOnHoliday: ${businessHours.isOnHoliday(new Date())}`);
  }

  if (!isStoreOpen)
    return (
      <>
        <h1>{t("store_closed")}</h1>
        <div>
          {t("store_next_opening_hours")}
          {closed_descr}
        </div>
      </>
    );

  // http://localhost:3000/4574496e-9759-4d9c-9258-818501418747/dfc853b4-47f5-400c-a2fb-f70f045d65a0
  return (
    <section className="relative w-full justify-center content-center items-center">
      <div className="pl-1 pr-1">
        {!storeData.isOpen && <h2 className="text-2xl xs:text-xl font-extrabold">{t("store_closed")}</h2>}
        <div className="pl-2 pb-5">
          {tableData ? (
            <div className="">
              <div className="flex gap-2">
                {t("store_orderTotal")}
                <div className="text-sm">
                  <Link href="#">{t("store_linkToOrder")}</Link>
                </div>
              </div>
              <div className='text-xl font-extrabold'>
                {t("storeTables")}: {tableData.tableName}
              </div>
              <div>{t("store_seatingTime")}</div>
              <div>2大人 0小孩</div>
            </div>
          ) : (
            <div className='text-xl font-extrabold'>{t("store_orderType_takeoff")}</div>
          )}
        </div>
        {mongoData?.orderNoteToCustomer && (
          <div className="pl-5 pb-5">
            <pre>{mongoData.orderNoteToCustomer}</pre>
          </div>
        )}

        {/* menu */}
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
      </div>
    </section>
  );
};
