"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { type Item, useCart } from "@/hooks/use-cart";

import { useTranslation } from "@/app/i18n/client";
import CartItemInfo from "@/components/cart-item-info";
import Currency from "@/components/currency";
import StoreNoItemPrompt from "@/components/store-no-item-prompt";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import Container from "@/components/ui/container";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { useI18n } from "@/providers/i18n-provider";
import type {
	Store,
	StoreOrder,
	StorePaymentMethodMapping,
	StoreShipMethodMapping,
	User,
} from "@/types";
import type { Address, PaymentMethod, ShippingMethod } from "@prisma/client";
import axios, { type AxiosError } from "axios";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { saveOrderToLocal } from "@/lib/order-history";
import { getRandomNum } from "@/lib/utils";

type props = {
	store: Store;
	user: User | null;
	onChange?: (newValue: boolean) => void;
};

// parse cart into order, and process to the selected payment method
// TODO: implement shipping method
export const Checkout = ({ store, user }: props) => {
	const cart = useCart();
	const router = useRouter();

	const [inCheckoutSteps, setInCheckoutSteps] = useState(false);

	if (cart.items.length === 0 && !inCheckoutSteps) {
		router.replace("/");

		return <StoreNoItemPrompt />;
	}

	return (
		<Container>
			<CheckoutSteps store={store} user={user} onChange={setInCheckoutSteps} />
		</Container>
	);
};

const CheckoutSteps = ({ store, user, onChange }: props) => {
	const router = useRouter();
	const params = useParams();

	const cart = useCart();
	const [, setNumInCart] = useState(cart.totalItems);

	useEffect(() => {
		setNumInCart(cart.totalItems);
	}, [cart.totalItems]);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [isLoading, setIsLoading] = useState(false);
	const [states, setStates] = useState({
		orderId: "",
		orderNote: "",
	});

	//const searchParams = useSearchParams();
	// see if there is a tableId in querystring
	//const tableId = searchParams.get("tableId");
	//console.log("tableId", tableId);

	const allShipMethods = store.StoreShippingMethods as StoreShipMethodMapping[];

	let shipMethod = allShipMethods[0].ShippingMethod;

	/*
  const [shipMethod, setShipMethod] = useState<ShippingMethod>(
		allShipMethods[0].ShippingMethod,
	);
  */
	// determine shipping method
	// if there's table id, use 內用 as shipping method

	//console.log("allShipMethods: " + JSON.stringify(allShipMethods));
	//console.log("params.tableId", params.tableId);

	if (params.tableId && params.tableId !== "undefined") {
		const instore = allShipMethods.find(
			(o: StoreShipMethodMapping) => o.ShippingMethod.identifier === "in-store",
		);
		if (instore) {
			shipMethod = instore.ShippingMethod;
		}
	} else {
		const takeout = allShipMethods.find(
			(o: StoreShipMethodMapping) => o.ShippingMethod.identifier === "takeout",
		);
		if (takeout) {
			shipMethod = takeout.ShippingMethod;
		}
	}

	//console.log("selected shipMethod: " + JSON.stringify(shipMethod));

	// default to cash if available
	const allpaymentMethods =
		store.StorePaymentMethods as StorePaymentMethodMapping[];

	let defaultPaymentMethod = allpaymentMethods.find(
		(o: StorePaymentMethodMapping) => o.PaymentMethod.name === "cash",
	);

	if (!defaultPaymentMethod) {
		defaultPaymentMethod = allpaymentMethods[0];
	}

	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
		defaultPaymentMethod.PaymentMethod,
	);

	/*
  console.log("StorePaymentMethods", JSON.stringify(allpaymentMethods));
  console.log(`selected paymentMethod: ${JSON.stringify(paymentMethod)}`);

  //const [selectedPaymentType, setSelectedPaymentType] = useState('creditCard');
  //console.log('CheckutSteps: ' + JSON.stringify(shipMethods));
  */

	const hanlePaymentChange = (selectedPaymentMethodId: string) => {
		//console.log("hanlePaymentChange", selectedPaymentMethodId);

		const selected = allpaymentMethods.find(
			(o: StorePaymentMethodMapping) =>
				o.PaymentMethod.id === selectedPaymentMethodId,
		);
		if (selected) setPaymentMethod(selected.PaymentMethod);
		//console.log('selected payment type: ' + selected?.paymentMethod.name);
	};

	const handleOrderDataChange = (
		e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
	) => {
		setStates({
			...states,
			[e.target.name]: e.target.value.trim(),
		});
	};

	//if (!user) return <AskUserToSignIn />;
	//console.log('user: ' + JSON.stringify(user.addresses));

	//create an order, and then process to the selected payment method
	//
	const placeOrder = async () => {
		setIsLoading(true);

		if (!paymentMethod) {
			const errmsg = t("checkout_no_paymentMethod");
			console.error(errmsg);
			setIsLoading(false);

			return;
		}
		if (!shipMethod) {
			const errmsg = t("checkout_no_shippingMethod");
			console.error(errmsg);
			setIsLoading(false);

			return;
		}

		// convert cart items into string array to send to order creation
		const productIds: string[] = [];
		const prices: number[] = [];
		const quantities: number[] = [];
		//const notes: string[] = [];
		const variants: string[] = [];
		const variantCosts: string[] = [];

		cart.items.map((item) => {
			if (item.id.includes("?")) {
				/*
        console.log("item.id", item.id);
        console.log("productId", item.id.split("?")[0]);
        console.log("item.variants", item.variants);
        console.log("item.variantCosts", item.variantCosts);
        */
				productIds.push(item.id.split("?")[0]);
				variants.push(item.variants);
				variantCosts.push(item.variantCosts);
			} else {
				productIds.push(item.id);
			}
			prices.push(item.price);
			quantities.push(Number(item.quantity));
			//notes.push(item.userData);
		});

		const url = `${process.env.NEXT_PUBLIC_API_URL}/store/${params.storeId}/create-order`;
		const body = JSON.stringify({
			userId: user?.id, //user is optional
			tableId: cart.items[0].tableId,
			total: cart.cartTotal,
			currency: store.defaultCurrency,
			productIds: productIds,
			quantities: quantities,
			unitPrices: prices,
			variants: variants,
			variantCosts: variantCosts,
			orderNote: states.orderNote,
			shippingMethodId: shipMethod.id,
			//shippingAddress: displayUserAddress(user),
			//shippingCost: shipMethod.basic_price,
			paymentMethodId: paymentMethod.id,
			//pickupCode: getRandomNum(6),
		});
		//console.log(JSON.stringify(body));

		try {
			const result = await axios.post(url, body);

			//console.log('featch result', JSON.stringify(result));

			const order = result.data.order as StoreOrder;
			//console.log('order.id', order.id);

			// ANCHOR clear cart of the order placed
			//
			if (order) {
				//if (!user)
				// if no signed-in user, save order to local storage
				saveOrderToLocal(order);

				// NOTE: if we allow customer to checkout parial of cart items, this need to be adjusted
				cart.emptyCart(); //clear cart
			}

			//return value to parent component
			onChange?.(true);

			// redirect to payment page
			const paymenturl = `/checkout/${order.id}/${paymentMethod.payUrl}`;
			router.push(paymenturl);
		} catch (error: unknown) {
			const err = error as AxiosError;
			console.error(error);
			toast({
				title: "Something went wrong.",
				description: t("checkout_placeOrder_exception") + err.message,
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="px-2">
			{/* #region 訂單商品 */}
			<div className="text-lg font-medium">{t("checkout")}</div>
			<Card>
				<CardHeader>
					<CardTitle>{t("checkout_orderitems")}</CardTitle>
					<CardDescription> </CardDescription>
				</CardHeader>
				<CardContent>
					{cart.items.length !== 0 &&
						cart.items.map((item, index) => (
							<div key={item.id} className="flex">
								<div className="flex-none w-1">{index + 1}</div>
								<div className="grow">
									<CartItemInfo
										item={item as Item}
										showProductImg={true}
										showQuantity={true}
										showVarity={true}
										showSubtotal={true}
									/>
								</div>
								{/* <div className="">table:{item.tableId}</div>*/}
							</div>
						))}
				</CardContent>

				<CardFooter>
					<div className="relative w-full">
						<div className="">
							{/*備註 */}
							<div className="sm:text-xs">{t("checkout_denote")}</div>
							<Input
								type="text"
								name="orderNote"
								value={states.orderNote}
								onChange={handleOrderDataChange}
							/>
						</div>

						{/*
            <div className="flex justify-between">
              <div className="flex-auto w-1/3 pr-5">
                <div className="sm:text-xs">{t("checkout_shipping_label")}</div>
                <div className="flex">
                  <div className="pr-5 flex">{shipMethod?.name}</div>

                  <div className="sm:block hidden">
                    {Number(shipMethod.basic_price) > 0 &&
                      displayUserAddress(user)}
                  </div>

                  <DialogShipping
                    allMappings={allShipMethods}
                    user={user}
                    onChange={setShipMethod}
                  />
                </div>
              </div>
                            <div className="justify-end place-self-end flex">
                <div className="sm:text-xs">{t("checkout_shipping_cost")}</div>
                {shipMethod && (
                  <Currency value={Number(shipMethod.basic_price)} />
                )}
              </div>
              </div>
              */}

						<div className="flex items-center justify-end place-self-end mt-2">
							<div className="sm:text-xs">{t("checkout_orderTotal")}</div>
							<Currency value={cart.cartTotal} />
						</div>
					</div>
				</CardFooter>
			</Card>

			{/* #region 付款方式 */}
			<Card className="mt-2">
				<CardHeader>
					<CardTitle>{t("checkout_paymentMethod")}</CardTitle>
				</CardHeader>
				<CardContent>
					<RadioGroup
						className="flex"
						defaultValue={paymentMethod.id}
						onValueChange={(val) => hanlePaymentChange(val)}
					>
						{allpaymentMethods.map((mapping) => (
							<div
								key={mapping.methodId}
								className="flex items-center space-x-2"
							>
								<RadioGroupItem
									value={mapping.methodId}
									id={mapping.methodId}
								/>
								<Label htmlFor={mapping.methodId}>
									{mapping.paymentDisplayName !== null
										? mapping.paymentDisplayName
										: mapping.PaymentMethod.name}
								</Label>
							</div>
						))}
					</RadioGroup>
					<div className="pt-2">{shipMethod?.name}</div>
				</CardContent>
				<CardFooter>
					<div className="relative w-full">
						<div className="text-xs pb-2">{t("checkout_note")}</div>

						<div className="flex justify-between items-center">
							<Button
								type="button"
								disabled={isLoading}
								className="disabled:opacity-50 lg:text-2xl w-1/2 p-5"
								onClick={() => placeOrder()}
							>
								{t("checkout_orderButton")}
							</Button>
							<Button
								variant={"outline"}
								type="button"
								disabled={isLoading}
								className="disabled:opacity-50"
								onClick={() => router.back()}
							>
								{t("checkout_keepShoppingButton")}
							</Button>
						</div>
					</div>
				</CardFooter>
			</Card>
		</div>
	);
};

function displayUserAddress(user?: User | null) {
	if (!user) return "";

	if (user?.Addresses) {
		let the_address = user.Addresses.find(
			(obj: Address) => obj.isDefault === true,
		);
		if (!the_address) the_address = user.Addresses[0];
		//console.log('the_address: ' + JSON.stringify(the_address));

		if (!the_address) return "";

		return `${the_address.postalCode} ${the_address.city}${the_address.district}${the_address.streetLine1}`;
	}
}

type shippingDialogProps = {
	allMappings: StoreShipMethodMapping[];
	user: User | null;
	onChange?: (newMethod: ShippingMethod) => void;
};
