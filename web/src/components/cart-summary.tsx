"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useTranslation } from "@/app/i18n/client";
import Currency from "@/components/currency";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useI18n } from "@/providers/i18n-provider";

const CartSummary = () => {
	const searchParams = useSearchParams();
	//const items = useCart((state) => state.items);
	//const removeAll = useCart((state) => state.removeAll);
	const cart = useCart();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	useEffect(() => {
		if (searchParams.get("success")) {
			//toast.success("Payment completed.");
			cart.emptyCart();
			//removeAll();
		}

		if (searchParams.get("canceled")) {
			//toast.error("Something went wrong.");
		}
	}, [searchParams, cart]);

	const totalPrice = cart.cartTotal;
	/*
  const totalPrice = items.reduce((total, item) => {
	return total + Number(item.price) * item.quantity;
  }, 0);
*/
	/*
  const onCheckout = async () => {
	//create order and stripe payment intent, and then redirect to stripe's checkout page
	const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/checkout`, {
	  productIds: items.map((item) => item.id)
	});

	window.location = response.data.url;
  }
  */
	const router = useRouter();

	function onCheckout() {
		//create order?
		router.push("/checkout");
	}

	return (
		<div className="py-5 sm:py-1 px-0 mx-auto xl:container rounded min-h-[95%]">
			{cart.items.length > 0 && (
				<div className="grid grid-rows-1">
					<div className="">
						<div className="grid grid-cols-3 gap-2">
							<h2 className="sm:block hidden">{t("cart_summary_title")}</h2>

							<div className="flex">
								<div className="flex-none sm:pl-5 pr-2">
									{t("cart_summary_total")}
								</div>
								<div className="flex-none">
									<Currency value={totalPrice} />
								</div>
							</div>

							<div className="place-self-end">
								<Link href="/" className="pl-2 text-xs">
									{t("cart_summary_keepShopping")}
								</Link>
							</div>
						</div>
					</div>
					<div className="w-full">
						<Button
							onClick={onCheckout}
							disabled={cart.items.length === 0}
							value={"ghost"}
							className="w-full"
						>
							{t("cart_summary_placeOrder")}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
};

export default CartSummary;
