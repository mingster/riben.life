"use client";
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
import { ShoppingBag } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import Currency from "./currency";

export const DropdownCart = () => {
	const router = useRouter();

	const params = useParams<{ storeId: string; tableId: string }>();
	//console.log("storeId", params.storeId, "tableId", params.tableId);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [isOpen, setIsOpen] = useState(false);

	const cart = useCart();
	const [numInCart, setNumInCart] = useState(cart.totalItems);

	useEffect(() => {
		setNumInCart(cart.totalItems);
	}, [cart.totalItems]);

	function onCheckout() {
		//bring to checkout page and close the cart dropdown
		//close();
		setIsOpen(false);

		if (params.tableId !== null) {
			router.push(`/${params.storeId}/checkout/?tableId=${params.tableId}`);
		} else {
			router.push(`/${params.storeId}/checkout`);
		}
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
		<>
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
													{t("cart_dropDown_placeOrder")}
												</div>

												<div className="self-end">
													<Currency value={cart.cartTotal} />
												</div>
											</div>
										</Button>{" "}
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
						<SheetFooter className="mt-auto">
							<Button
								variant={"ghost"}
								className="content-end text-xs"
								onClick={removeAll}
							>
								remove all
							</Button>
						</SheetFooter>
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
};

export default DropdownCart;
