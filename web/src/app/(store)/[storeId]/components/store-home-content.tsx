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

import type { StoreSettings, StoreFacility } from "@prisma/client";
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

	const cart = useCart();

	const params = useParams<{ storeId: string; tableId: string }>();

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
						tableId: params.tableId,
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
			<div className="px-1">
				{!storeData.isOpen && (
					<h2 className="text-2xl xs:text-xl font-extrabold">
						{t("store_closed")}
					</h2>
				)}

				<div className="px-2 flex items-center gap-5">
					<div className="">
						{tableData ? (
							<div className="">
								<div className="flex gap-2">{t("store_orderTotal")}</div>
								<div className="text-xl font-extrabold">
									{t("storeTables")}: {tableData.facilityName}
								</div>
								<div>{t("store_seatingTime")}</div>
								<div>2大人 0小孩</div>
							</div>
						) : (
							<div className="text-xl font-extrabold">
								{/*外帶點餐*/}
								{t("store_orderType_takeoff")}
							</div>
						)}
					</div>
					<div className="text-sm">
						<Link href={`/order/?storeId=${storeData.id}`}>
							{t("store_linkToOrder")}
						</Link>
					</div>
				</div>

				{storeSettings?.orderNoteToCustomer && (
					<div className="pl-5 pb-5">
						<pre>{storeSettings.orderNoteToCustomer}</pre>
					</div>
				)}

				{/* side menu */}
				<div className="grid grid-cols-[20%_80%] gap-2 px-1">
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
											className="ss-item lg:text-xl"
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
								<div className="text-center w-full">
									<div className="lg:text-xl">{category.name}</div>
								</div>
								<div className="pb-10">
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
						<ArrowUpToLine className="size-[20px]" />
					</button>
				</div>
			</div>
		</section>
	);
};
