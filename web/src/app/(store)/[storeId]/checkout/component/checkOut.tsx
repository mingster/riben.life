"use client";

import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type props = {
  store: Store;
  user: User | null;
  onChange?: (newValue: boolean) => void;
};

// TODO: implement payment method & shipping method
export const Checkout = ({ store, user }: props) => {
  const cart = useCart();

  const [inCheckoutSteps, setInCheckoutSteps] = useState(false);

  return (
    <Container>
      <>
        {cart.items.length === 0 && !inCheckoutSteps ? (
          <StoreNoItemPrompt />
        ) : (
          <CheckoutSteps
            store={store}
            user={user}
            onChange={setInCheckoutSteps}
          />
        )}
      </>
    </Container>
  );
};

const CheckoutSteps = ({ store, user, onChange }: props) => {
  const router = useRouter();
  const params = useParams();

  const cart = useCart();
  const { lng } = useI18n();
  const { t } = useTranslation(lng);

  const [isLoading, setIsLoading] = useState(false);

  const [totalPrice, setTotalPrice] = useState(cart.cartTotal);
  const [states, setStates] = useState({
    orderId: "",
    orderNote: "",
  });

  const allShipMethods = store.StoreShippingMethods as StoreShipMethodMapping[];
  const [shipMethod, setShipMethod] = useState<ShippingMethod>(
    allShipMethods[0].ShippingMethod,
  );

  //console.log(`allShipMethods: ${JSON.stringify(allShipMethods)}`);

  const allpaymentMethods =
    store.StorePaymentMethods as StorePaymentMethodMapping[];
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    allpaymentMethods[0].PaymentMethod,
  );
  //const [selectedPaymentType, setSelectedPaymentType] = useState('creditCard');

  /*
  useEffect(() => {
    if (shipMethod) {
      setTotalPrice(Number(cart.cartTotal) + Number(shipMethod.basic_price));
    }
  }, [cart.cartTotal, shipMethod]);
  */

  //console.log('selected shipMethod: ' + shipMethod);
  //console.log('CheckutSteps: ' + JSON.stringify(shipMethods));

  const productIds: string[] = [];
  const prices: number[] = [];
  const quantities: number[] = [];
  //const notes: string[] = [];

  cart.items.map((item) => {
    productIds.push(item.id);
    prices.push(item.price);
    quantities.push(Number(item.quantity));
    //notes.push(item.userData);
  });

  const handleTabChange = (paymentMethodId: string) => {
    //setSelectedPaymentType(paymentMethodId);
    const selected = allpaymentMethods.find(
      (o: StorePaymentMethodMapping) => o.PaymentMethod.id === paymentMethodId,
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

    const url = `${process.env.NEXT_PUBLIC_API_URL}/store/${params.storeId}/create-order`;

    const body = JSON.stringify({
      userId: user?.id, //user is optional
      total: totalPrice,
      currency: store.defaultCurrency,
      productIds: productIds,
      quantities: quantities,
      unitPrices: prices,
      orderNote: states.orderNote,
      shippingMethodId: shipMethod.id,
      //shippingAddress: displayUserAddress(user),
      //shippingCost: shipMethod.basic_price,
      paymentMethodId: paymentMethod.id,
    });
    //console.log(JSON.stringify(body));

    try {
      const result = await axios.post(url, body);

      const order = result.data.order as StoreOrder;
      //console.log(`featch result: ${JSON.stringify(order)}`);
      //console.log(`order.id: ${order.id}`);

      // ANCHOR clear cart of the order placed
      //
      if (order) {
        //clear cart
        //cart.emptyCart();
        productIds.map((productId) => {
          cart.removeItem(productId);
        });
      }

      //return value to parent component
      onChange?.(true);

      const paymenturl = `/checkout/${order.id}/${paymentMethod.payUrl}`;
      //console.log('payment url: ' + url);
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
    <div className="pl-2 pr-2">
      {/* #region 訂單商品 */}
      <div className="text-lg font-medium">{t("checkout")}</div>
      <Card>
        <CardHeader>
          <CardTitle>{t("checkout_orderitems")}</CardTitle>
          <CardDescription> </CardDescription>
        </CardHeader>
        <CardContent>
          {cart.items.length !== 0 &&
            cart.items.map((item) => (
              <div key={item.id}>
                <CartItemInfo
                  item={item as Item}
                  showProductImg={true}
                  showQuantity={false}
                  showVarity={true}
                  showSubtotal={true}
                />
              </div>
            ))}
        </CardContent>

        <CardFooter>
          <div className="relative w-full">
            <div className="flex justify-between">
              <div className="flex-none w-1/3 pr-5">
                {/*備註 */}
                <div className="sm:text-xs">{t("checkout_denote")}</div>
                <Input
                  type="text"
                  name="orderNote"
                  value={states.orderNote}
                  onChange={handleOrderDataChange}
                />
                {user === null && <AskUserToSignIn />}
              </div>
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

            <div className="flex justify-end place-self-end mt-2">
              <div className="sm:text-xs">{t("checkout_orderTotal")}</div>
              <Currency value={totalPrice} />
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
          {/*
          <Tabs defaultValue={paymentMethod.id} onValueChange={handleTabChange}>
            <TabsList>
              {allpaymentMethods.map((mapping) => (
                <TabsTrigger key={mapping.id} value={mapping.PaymentMethod.id}>
                  {mapping.paymentDisplayName}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="paypal"> </TabsContent>
            <TabsContent value="creditCard"> </TabsContent>
          </Tabs>
           */}
        </CardContent>
        <CardFooter>
          <div className="relative w-full">
            <div className="flex justify-between">
              <div className="flex-none w-1/2 pr-1">
                <div className="sm:text-xs">{t("checkout_note")}</div>
              </div>
              <div className="flex w-1/2 justify-end place-self-end">
                <Button
                  type="button"
                  disabled={isLoading}
                  className="disabled:opacity-50"
                  onClick={() => placeOrder()}
                >
                  {t("checkout_orderButton")}
                </Button>
              </div>
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

const AskUserToSignIn = () => {
  const session = useSession();
  const { lng } = useI18n();
  const { t } = useTranslation(lng);

  let email = session.data?.user?.email as string;
  if (!email) email = "";

  return (
    <>
      {email === "" && (
        <div className="my-5">
          <Link
            title={t("checkout_signIn")}
            key="signin"
            href="#"
            onClick={() => signIn()}
            className="hover:font-bold text-primary"
          >
            {t("checkout_signIn")}
          </Link>
          {t("checkout_or")}
          <Link
            title={t("checkout_signUp")}
            key="signup"
            href="#"
            onClick={() => signIn()}
            className="hover:font-bold text-primary"
          >
            {t("checkout_signUp")}
          </Link>
          {t("checkout_signInNote")}
        </div>
      )}
    </>
  );
};

type shippingDialogProps = {
  allMappings: StoreShipMethodMapping[];
  user: User | null;
  onChange?: (newMethod: ShippingMethod) => void;
};

// display store supported shipping methods, and bind with user's default shipping perference
const DialogShipping = ({
  allMappings,
  user,
  onChange,
}: shippingDialogProps) => {
  const { lng } = useI18n();
  const { t } = useTranslation(lng);
  const [open, setOpen] = useState(false);
  //console.log(JSON.stringify(user));
  const [selectedMethod, setSelectedMethod] = useState<ShippingMethod>();
  function selectShipMethod(method: StoreShipMethodMapping) {
    setSelectedMethod(method.ShippingMethod);
    save();
  }
  function save() {
    if (selectedMethod) {
      onChange?.(selectedMethod);
      console.log(`selected: ${selectedMethod.name}`);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{t("checkout_shippingButton")}</Button>
      </DialogTrigger>
      <DialogDescription />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("checkout_shippingTitle")}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            {allMappings.map((method) => (
              // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
              <div
                key={method.id}
                className="cursor-pointer border px-5 py-5"
                onClick={() => selectShipMethod(method)}
              >
                {method.ShippingMethod.name}
                <Currency value={Number(method.ShippingMethod.basic_price)} />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="sm:justify-start">
          {/*
          <DialogClose asChild>
            <Button type="button" variant="link">
              取消
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="default"
            onClick={() =>
              //return value to parent component
              save()
            }
          >
            完成
          </Button>

*/}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
