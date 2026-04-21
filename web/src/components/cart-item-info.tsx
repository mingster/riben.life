import { IconMinus, IconPlus } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "@/app/i18n/client";
import Currency from "@/components/currency";
import IconButton from "@/components/ui/icon-button";
import { type Item, useCart } from "@/hooks/use-cart";
import { formatCurrencyAmount, intlLocaleFromAppLang } from "@/lib/intl-locale";
import { useI18n } from "@/providers/i18n-provider";

interface cartItemProps {
	item: Item;
	showProductImg: boolean;
	showQuantity: boolean;
	showVarity: boolean;
	showSubtotal: boolean;
	//onCartChange?: (newValue: number) => void;
	classNames?: string;
}

const CartItemInfo: React.FC<cartItemProps> = ({
	item: currentItem,
	showProductImg,
	showQuantity,
	showVarity,
	showSubtotal,
	//onCartChange,
	classNames,
}) => {
	const cart = useCart();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const lineCurrency = currentItem.currency ?? "twd";
	const priceLocale = intlLocaleFromAppLang(lng);

	if (!currentItem.quantity) currentItem.quantity = 1;

	const handleIncraseQuality = () => {
		let newQuantity = currentItem.quantity ?? 0;
		newQuantity += 1;
		currentItem.quantity = newQuantity;
		cart.updateItemQuantity(currentItem.id, newQuantity);

		//onCartChange?.(newQuantity);
		//console.log('handleIncraseQuality: ' + currentItem.quantity);
	};

	const handleDecreaseQuality = () => {
		//currentItem.quantity = currentItem.quantity - 1;
		let newQuantity = currentItem.quantity ?? 0;
		newQuantity -= 1;

		if (newQuantity <= 0) {
			const msg = t("cart_item_info_remove_confirm");
			if (confirm(msg)) {
				cart.removeItem(currentItem.id);
			}
		} else {
			currentItem.quantity = newQuantity;
			cart.updateItemQuantity(currentItem.id, newQuantity);
		}
		//onCartChange?.(newQuantity);
		//console.log('handleDecreaseQuality: ' + currentItem.quantity);
	};

	const handleQuantityInputChange = (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const result = event.target.value.replace(/\D/g, "");
		if (result) {
			cart.updateItemQuantity(currentItem.id, Number(result));
			//onCartChange?.(Number(result));
		}
	};
	/*
  const onRemove = () => {
    cart.removeItem(currentItem.id);
  };
*/

	const routeParams = useParams<{ storeId?: string }>();
	const routeStoreId =
		typeof routeParams.storeId === "string" ? routeParams.storeId : undefined;
	const envDefaultStoreId =
		typeof process.env.NEXT_PUBLIC_DEFAULT_STORE_ID === "string" &&
		process.env.NEXT_PUBLIC_DEFAULT_STORE_ID.length > 0
			? process.env.NEXT_PUBLIC_DEFAULT_STORE_ID
			: undefined;
	const productLinkStoreId = routeStoreId ?? envDefaultStoreId;

	function getLink(id: string, name: string) {
		switch (id) {
			/*
      case process.env.NEXT_PUBLIC_BIGCROSS_PRODUCT_ID:
        return (
          <Link
            href={`/${process.env.NEXT_PUBLIC_STORE_ID}/legod/bigcross/`}
            className="hover:text-slate"
          >
            {name}
          </Link>
        );
      case process.env.NEXT_PUBLIC_SMCROSS_PRODUCT_ID:
        return (
          <Link
            href={`/${process.env.NEXT_PUBLIC_STORE_ID}/legod/smcross/`}
            className="hover:text-slate"
          >
            {name}
          </Link>
        );
      */
			default: {
				// if id contains ?, it has options. return just name to prevent 404 error
				if (id.includes("?")) return <>{name}</>;

				const productId = (currentItem as { productId?: string }).productId;
				if (productId) {
					const href = productLinkStoreId
						? `/shop/${productLinkStoreId}/p/${productId}`
						: "/shop";
					return (
						<Link href={href} className="hover:text-slate">
							{name}
						</Link>
					);
				}

				return (
					<Link href="#" className="hover:text-slate">
						{name}
					</Link>
				);
			}
		}
	}

	return (
		currentItem &&
		cart.items.length > 0 && (
			<div className={classNames}>
				{currentItem.images && showProductImg && (
					<div className="relative rounded-md overflow-hidden">
						<Image
							fill={false}
							priority={false}
							src={currentItem.images[0].url}
							alt={currentItem.name}
							width={45}
							height={45}
							className="h-auto w-auto max-w-none object-cover object-center sm:block hidden"
						/>
					</div>
				)}

				<div className="relative ml-4 flex flex-1 flex-col justify-between sm:ml-6">
					<div className="relative pr-0 w-full">
						<div className="flex justify-between content-center">
							<div className="flex-none w-1/2 pr-2">
								{getLink(currentItem.id, currentItem.name)}
								{currentItem.itemOptions &&
									currentItem.itemOptions.length > 0 && (
										<ul className="pl-2 text-sm">
											{currentItem.itemOptions.map((itemOption) => (
												<li key={itemOption.id}>{itemOption.value}</li>
											))}
										</ul>
									)}
								{currentItem.shopPriceBreakdown && (
									<ul className="mt-1 space-y-0.5 pl-2 text-xs text-muted-foreground">
										<li>
											{t("cart_line_price_base")}:{" "}
											{formatCurrencyAmount(
												currentItem.shopPriceBreakdown.productBase,
												lineCurrency,
												priceLocale,
											)}
										</li>
										{currentItem.shopPriceBreakdown.optionExtra > 0 && (
											<li>
												{t("cart_line_price_options")}: +
												{formatCurrencyAmount(
													currentItem.shopPriceBreakdown.optionExtra,
													lineCurrency,
													priceLocale,
												)}
											</li>
										)}
										{currentItem.shopPriceBreakdown.customizationSurcharge !=
											null &&
											currentItem.shopPriceBreakdown.customizationSurcharge >
												0 && (
												<li>
													{t("cart_line_price_customization")}: +
													{formatCurrencyAmount(
														currentItem.shopPriceBreakdown
															.customizationSurcharge,
														lineCurrency,
														priceLocale,
													)}
												</li>
											)}
										<li>
											{t("cart_line_price_unit")}:{" "}
											{formatCurrencyAmount(
												currentItem.shopPriceBreakdown.unitTotal,
												lineCurrency,
												priceLocale,
											)}
										</li>
									</ul>
								)}
							</div>

							{showQuantity && (
								<div className="pl-2">
									<div className="flex">
										<div className="flex flex-nowrap content-center w-[20px]">
											{currentItem.quantity && currentItem.quantity > 0 && (
												//{currentItem.quantity > 0 && (
												<IconButton
													onClick={handleDecreaseQuality}
													icon={
														<IconMinus
															size={18}
															className="dark:text-primary text-slate-500"
														/>
													}
												/>
											)}
										</div>
										<div className="flex flex-nowrap content-center item">
											<input
												type="number"
												className="w-10 text-center border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
												placeholder="0"
												value={currentItem.quantity}
												onChange={handleQuantityInputChange}
											/>
										</div>
										<div className="flex flex-nowrap content-center w-[20px]">
											<IconButton
												onClick={handleIncraseQuality}
												icon={
													<IconPlus
														size={18}
														className="dark:text-primary text-slate-500"
													/>
												}
											/>
										</div>
									</div>
								</div>
							)}
							{!showQuantity && (
								<div className="pr-2">{currentItem.quantity}</div>
							)}

							{showSubtotal && (
								<Currency
									value={Number(currentItem.quantity * currentItem.price)}
									currency={lineCurrency}
									lng={lng}
								/>
							)}
						</div>
					</div>
				</div>
			</div>
		)
	);
};

export default CartItemInfo;
