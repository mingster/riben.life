"use client";

import { useTranslation } from "@/app/i18n/client";
import { toastError, toastSuccess } from "@/components/toaster";
import { ProductCard } from "@/components/product-card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { type Item, useCart } from "@/hooks/use-cart";
import BusinessHours from "@/lib/businessHours";
import { useI18n } from "@/providers/i18n-provider";
import type {
	Category,
	Product,
	ProductCategories,
	StoreWithProductNCategories,
} from "@/types";
import { ProductStatus } from "@/types/enum";
import { getAbsoluteUrl } from "@/utils/utils";

import type {
	StoreSettings,
	StoreFacility,
	RsvpSettings,
} from "@prisma/client";
import { formatDate } from "date-fns";
import { ArrowUpToLine } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ScrollSpy from "react-ui-scrollspy";
import logger from "@/lib/logger";

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
	storeSettings: StoreSettings;
	tableData?: StoreFacility;
}

// store home page.
// if store is opened (according to business hours), display menu (categorized products),
// and seating status (take off/in store).
// If store is closed, display the closing time.
//
export const StoreHomeContent: React.FC<props> = ({
	storeData,
	storeSettings,
	tableData,
}) => {
	/*
  const session = useSession();
  //
  //const router = useRouter();

  //const [type, setType] = useState<string>('monthly');
  //const [price, setPrice] = useState<number>(12.95);
  //const stripePromise = getStripe();
  //const [order, setOrder] = useState<StoreOrder>();
  const params = useParams<{ storeId: string }>();

  logger.info("storeData");
  logger.info("utc");
  logger.info("now");
  */

	//console.log(JSON.stringify(rsvpSettings));

	const cart = useCart();

	const params = useParams<{ storeId: string; facilityId: string }>();

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const isProduction = process.env.NODE_ENV === "production";
	if (!isProduction) {
		// client logging
		//logger.info(storeData);
	}

	/*
	const c = new CryptoUtil();
	const result = c.encrypt("1234567890");
	logger.info({ result }, "encrypt");

	logger.info({ decrypted: c.decrypt(result) }, "decrypt");
	logger.info({ decrypted2: c.decrypt("/X4KqzCddx9So7321NJhLw==") }, "decrypt2");
  */

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
	if (storeData.useBusinessHours && storeSettings.businessHours !== null) {
		// determine store is open using business hour setting
		const bizHour = storeSettings.businessHours;
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

	//removeOrders();
	//const orders = getOrdersToday() as StoreOrder[];
	//console.log('orders', JSON.stringify(orders));

	const handleAddToCart = (product: Product, newItem: Item | null) => {
		if (newItem != null) {
			// add product to cart with variants
			const test = cart.getItem(newItem.id);
			if (test) {
				cart.updateItemQuantity(newItem.id, test.quantity + 1);
			} else {
				cart.addItem(newItem, newItem?.quantity ?? 1);
			}
		} else {
			// add product to cart with no variant
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
						facilityId: params.facilityId,
						//...product,
						//cartStatus: CartProductStatus.InProgress,
						//userData: "",
					},
					1,
				);
			}
		}

		//router.push('/cart');
		toastSuccess({
			title: t("product_added_to_cart"),
			description: "",
		});
	};

	// http://localhost:3000/4574496e-9759-4d9c-9258-818501418747/dfc853b4-47f5-400c-a2fb-f70f045d65a0
	return (
		<section className="relative w-full place-content-center items-center">
			<div className="px-3 sm:px-4 lg:px-6">
				{!storeData.isOpen && (
					<h2 className="text-xl sm:text-2xl font-extrabold mb-4">
						{t("store_closed")}
					</h2>
				)}

				{storeSettings?.orderNoteToCustomer && (
					<div className="pl-3 sm:pl-5 pb-4 sm:pb-5 text-sm sm:text-base">
						<pre className="whitespace-pre-wrap break-words">
							{storeSettings.orderNoteToCustomer}
						</pre>
					</div>
				)}

				{/* side menu */}
				<div className="grid grid-cols-1 sm:grid-cols-[20%_80%] gap-2 sm:gap-3 px-1 sm:px-2">
					<div className="self-start sticky top-20 sm:top-24 hidden sm:block">
						{/* 20% sidebar - Hidden on mobile, shown on desktop */}
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
											className="ss-item lg:text-xl min-h-[44px] touch-manipulation"
										>
											{category.name}
										</div>
									</a>
								))}
							</div>
							<ScrollBar orientation="vertical" />
						</ScrollArea>
					</div>

					<ScrollSpy scrollThrottle={100} useBoxMethod={false}>
						{storeData.Categories?.map((category: Category) => (
							<div key={category.id} id={category.id} className="">
								<div className="text-center w-full py-4 sm:py-6">
									<div className="text-lg sm:text-xl lg:text-2xl font-semibold">
										{category.name}
									</div>
								</div>
								<div className="pb-6 sm:pb-8 lg:pb-10">
									{(category.ProductCategories as ProductCategories[])?.map(
										(pc) =>
											pc.Product.status === ProductStatus.Published && (
												<ProductCard
													key={pc.Product.id}
													disableBuyButton={!storeData.isOpen}
													onValueChange={(newItem: Item) => {
														handleAddToCart(pc.Product, newItem);
													}}
													onPurchase={() => handleAddToCart(pc.Product, null)}
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

				{/* scroll up to top */}
				<div className="relative flex w-full justify-center align-top py-2">
					<button
						className="h-12 w-12 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-background border shadow-sm hover:bg-muted active:bg-muted/70 transition-colors touch-manipulation sm:h-10 sm:w-10 sm:min-h-0 sm:min-w-0"
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
						<ArrowUpToLine className="h-5 w-5 sm:size-[20px]" />
					</button>
				</div>
			</div>
		</section>
	);
};
