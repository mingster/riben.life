"use client";
import { ShoppingBag } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/app/i18n/client";
import CartItemInfo from "@/components/cart-item-info";
import StoreNoItemPrompt from "@/components/store-no-item-prompt";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
//import { Badge } from '@mui/material';
import { useCart } from "@/hooks/use-cart";
import { useI18n } from "@/providers/i18n-provider";
import { useResolvedCustomerStoreBasePath } from "@/providers/customer-store-base-path";
import Currency from "./currency";

const fallbackSegmentForBasePath = "__store_segment__";

export const DropdownCart = () => {
	const router = useRouter();

	const params = useParams<{ storeId?: string; tableId?: string }>();

	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [isOpen, setIsOpen] = useState(false);

	const cart = useCart();
	const [numInCart, setNumInCart] = useState(cart.totalItems);

	const fromParamsStoreId =
		typeof params.storeId === "string" && params.storeId.length > 0
			? params.storeId
			: undefined;
	const fromMetaStoreId = cart.metadata?.storeId as string | undefined;
	const fromEnvStoreId =
		typeof process.env.NEXT_PUBLIC_DEFAULT_STORE_ID === "string" &&
		process.env.NEXT_PUBLIC_DEFAULT_STORE_ID.length > 0
			? process.env.NEXT_PUBLIC_DEFAULT_STORE_ID
			: undefined;
	const segmentForCustomerBase =
		fromParamsStoreId ??
		fromMetaStoreId ??
		fromEnvStoreId ??
		fallbackSegmentForBasePath;
	const customerBasePath = useResolvedCustomerStoreBasePath(
		segmentForCustomerBase,
	);

	useEffect(() => {
		setNumInCart(cart.totalItems);
	}, [cart.totalItems]);

	function onCheckout() {
		setIsOpen(false);

		const storeId = fromParamsStoreId ?? fromMetaStoreId ?? fromEnvStoreId;

		if (!storeId) {
			toast.error(t("cart_checkout_missing_store_title"), {
				description: t("cart_checkout_missing_store_description"),
			});
			router.push("/shop");
			return;
		}

		// D2C `/shop`: bag checkout (Stripe) on cart page.
		if (!fromParamsStoreId) {
			router.push(`/shop/${storeId}/cart`);
			return;
		}

		const tableId = params.tableId;
		const hasTable =
			typeof tableId === "string" &&
			tableId.length > 0 &&
			tableId !== "undefined";

		const path = hasTable
			? `${customerBasePath}/checkout?tableId=${encodeURIComponent(tableId)}`
			: `${customerBasePath}/checkout`;
		router.push(path);
	}

	function removeAll() {
		cart.emptyCart();
	}
	/*
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return <></>;
  */

	return (
		<Sheet open={isOpen} onOpenChange={setIsOpen}>
			<SheetTrigger asChild>
				<strong className="relative inline-flex items-center rounded">
					{numInCart > 0 && (
						<span className="absolute -top-1 -right-2 size-5 rounded-full bg-red-800 text-slate-100 flex justify-center items-center text-xs pb-1">
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
							className="text-slate-400 hover:opacity-50 duration-300 ease-in-out size-5"
						/>
					</Button>
				</strong>
			</SheetTrigger>

			<SheetTitle />
			<SheetDescription />

			<SheetContent side="right">
				<div className="overflow-y-scroll w-full px-1 flex flex-col gap-y-8 no-scrollbar h-[calc(100vh-20px)]">
					<div className="flex-1 pt-5">
						{cart.items.length === 0 ? (
							<StoreNoItemPrompt />
						) : (
							<>
								<strong className="w-full relative inline-flex items-center rounded">
									{numInCart > 0 && (
										<span className="absolute -top-1 -right-2 size-5 rounded-full bg-red-800 text-slate-100 flex justify-center items-center text-xs pb-1">
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
												{t("cart_drop_down_place_order")}
											</div>

											<div className="self-end">
												<Currency value={cart.cartTotal} colored={false} />
											</div>
										</div>
									</Button>
								</strong>

								{/* render cart items */}
								{cart.items.map((item) => (
									<CartItemInfo
										classNames="pt-5 pb-5"
										key={item.id}
										item={item}
										showProductImg={false}
										showQuantity={true}
										showVarity={true}
										showSubtotal={true}
									/>
								))}
							</>
						)}
					</div>
					<SheetFooter className="mt-auto flex w-full flex-col gap-2 border-t border-border/60 pt-4">
						<Button
							onClick={onCheckout}
							disabled={cart.items.length === 0}
							className="w-full"
						>
							<div className="flex w-full items-center justify-between">
								<div className="grow">{t("cart_drop_down_place_order")}</div>
								<div className="self-end">
									<Currency value={cart.cartTotal} colored={false} />
								</div>
							</div>
						</Button>
						<Button
							variant="ghost"
							className="h-10 w-full touch-manipulation font-mono text-xxs sm:h-9 sm:min-h-0"
							onClick={removeAll}
							disabled={cart.items.length === 0}
						>
							remove all
						</Button>
					</SheetFooter>
				</div>
			</SheetContent>
		</Sheet>
	);
};

export default DropdownCart;
