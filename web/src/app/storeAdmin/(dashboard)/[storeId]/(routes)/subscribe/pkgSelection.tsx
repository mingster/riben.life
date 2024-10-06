"use client";

import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import type { Store } from "@/types";
import { useParams, useRouter } from "next/navigation";

import { ConfirmModal } from "@/components/modals/cofirm-modal";
import { getAbsoluteUrl } from "@/lib/utils";

import {
  Elements,
  LinkAuthenticationElement,
  PaymentElement,
  useElements, useStripe,
} from "@stripe/react-stripe-js";

import type {
  Appearance,
  StripeElementsOptions
} from "@stripe/stripe-js";



import { useSession } from "next-auth/react";
import { type ChangeEvent, useEffect, useState } from "react";

import getStripe from "@/lib/stripe/client";

import { StoreLevel, SubscriptionStatus } from "@/types/enum";
import type { Subscription, SubscriptionPayment } from "@prisma/client";
import axios from "axios";
import { useTheme } from "next-themes";

// display package selectiion ui and call back end api to create related payment objects such as paymentintent
//
export function PkgSelection({ store, subscription }: { store: Store, subscription: Subscription }) {
  const [step, setStep] = useState(1);
  const [order, setOrder] = useState<SubscriptionPayment | null>(null);
  useEffect(() => {
    if (order) {
      setStep(2);
    }
  }, [order]);

  if (step === 1) return <DisplayPkg store={store} subscription={subscription} onValueChange={setOrder} />;
  if (step === 2 && order) return <SubscriptionStripe order={order} />;
}

type props = {
  store: Store;
  subscription: Subscription;
  onValueChange?: (newValue: SubscriptionPayment) => void;
};
// display package ui. As user select a package, call back end api and pass back selected package.
const DisplayPkg: React.FC<props> = ({ store, subscription, onValueChange }) => {
  const params = useParams();
  const router = useRouter();
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  //console.log("level", store.level);

  function handleDivClick(selected: number) {
    if (selected === store.level) {
      alert(t("storeAdmin_switchLevel_duplicated"));
      return;
    }

    // user switch to free version
    if (selected === StoreLevel.Free && store.level !== StoreLevel.Free) {
      if (confirm("您將調整到基礎版，調整會立即生效，確定嗎？")) {
        store.level = selected;
        unsubscribe();
      }
    } else {
      setOpen(true);
    }
  }

  const unsubscribe = async () => {
    setLoading(true);

    const ret = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/unsubscribe/`,
    );

    if (ret.status === 200) {
      store.level = StoreLevel.Free;
      alert('您已回復到基礎版。');
    }

    //console.log("ret", ret);
    setLoading(false);
    router.replace('/storeAdmin/' + params.storeId + '/subscribe');
    //router.refresh();
  }

  const onSelect = async () => {
    // create SubscriptionPayment object and pass to SubscriptionStripe
    setLoading(true);
    const ret = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/subscribe/`,
    );

    const order = ret.data as SubscriptionPayment;
    //console.log("order", order.id);
    onValueChange?.(order); // pass back to parent component
    setOpen(false);
    setLoading(false);
  };

  return (
    <>
      <ConfirmModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onSelect}
        loading={loading}
        title={t("storeAdmin_switchLevel_title")}
        description={t("storeAdmin_switchLevel_description")}
      />
      <div
        className={cn("max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8")}
      >
        <div className="sm:flex sm:flex-col sm:align-center">
          <h1 className="text-4xl font-extrabold sm:text-center sm:text-6xl">
            {t("storeAdmin_switchLevel_pageTitle")}
          </h1>
          <div className="max-w-2xl m-auto mt-5 text-xl sm:text-center sm:text-2xl">
            {
              // if no subscription...
              (subscription === null || subscription.status === SubscriptionStatus.Inactive) ?
                t("storeAdmin_switchLevel_pageDescr") :
                "您目前已訂閱"
            }
          </div>
        </div>

        <div className="mt-12 w-full space-y-0 flex justify-center gap-6 max-w-4xl mx-auto min-h-[calc(100vh-48px-36px-16px-32px-50px)]">
          {/* 基礎版*/}
          <div
            onClick={() => handleDivClick(StoreLevel.Free)}
            onKeyUp={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                handleDivClick(StoreLevel.Free);
              }
            }}
            className={cn(
              "flex flex-col basis-1/3 rounded-lg shadow-sm p-5 max-w-xs border border-gray-500 hover:cursor-pointer hover:bg-zinc-900 hover:border-pink-500",
              store.level === StoreLevel.Free
                ? "border-pink-500 dark:hover:bg-blue-900"
                : "border-gray-500",
            )}
          >
            <div className="flex-1">
              <h2 className="text-2xl font-semibold leading-6">
                {t("storeAdmin_switchLevel_free")}
              </h2>
              <div className="mt-8 text-2xl font-extrabold">1%/營業額</div>
              <div className="mt-4">無需任何前置費用，有成交才會產生費用。</div>

              <ul className="list-square pl-5 pt-2">
                <li>預約/排隊系統</li>
                <li>掃碼點餐系統</li>
                <li>線上點餐系統</li>
                <li>交易資料保存一個月</li>
                <li>OTA update：系統功能持續自動更新</li>
              </ul>
            </div>
          </div>

          {/* 進階版*/}
          <div
            onClick={() => handleDivClick(StoreLevel.Pro)}
            onKeyUp={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                handleDivClick(StoreLevel.Pro);
              }
            }}
            className={cn(
              "flex flex-col basis-1/3 rounded-lg shadow-sm p-5 max-w-xs border border-gray-500 hover:cursor-pointer hover:bg-zinc-900 hover:border-pink-500",
              store.level === StoreLevel.Pro
                ? "border-pink-500 dark:hover:bg-blue-900"
                : "border-gray-500",
            )}
          >
            <div className="flex-1">
              <h2 className="text-2xl font-semibold leading-6">
                {t("storeAdmin_switchLevel_pro")}
              </h2>
              <div className="mt-8 text-2xl font-extrabold">$300/每月</div>

              <div className="mt-4">適合穩定營運的店家。</div>
              <div className="mt-4">所有基礎版功能</div>

              <ul className="list-square pl-5 pt-2">
                <li>使用現金或原有店內系統結帳</li>
                <li>自定義付款方式：LINE Pay、街口支付、一卡通等</li>
                <li>
                  進階分析報表：掌握產品銷售/時段、來客數、客單價等數據分析
                </li>
                <li>交易資料永久保存，直到取消為止</li>
              </ul>
            </div>
          </div>

          {/* 多店版*/}
          <div
            onClick={() => handleDivClick(StoreLevel.Multi)}
            onKeyUp={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                handleDivClick(StoreLevel.Multi);
              }
            }}
            className={cn(
              "flex flex-col basis-1/3 rounded-lg shadow-sm p-5 max-w-xs border border-gray-500 hover:cursor-pointer hover:bg-zinc-900 hover:border-pink-500",
              store.level === StoreLevel.Multi
                ? "border-pink-500  dark:hover:bg-blue-900"
                : "border-gray-500",
            )}
          >
            <div className="flex-1">
              <h2 className="text-2xl font-semibold leading-6">
                {t("storeAdmin_switchLevel_multi")}
              </h2>
              <div className="mt-8">
                <span className="text-2xl font-extrabold">$300/每店</span>
              </div>

              <div className="mt-4">適合連鎖品牌。</div>
              <div className="mt-4">所有進階版功能</div>

              <ul className="list-square pl-5 pt-2">
                <li>多店管理</li>
                <li>店長帳號，多工管理</li>
                <li>店舖比較、分析報表</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

type paymentProps = {
  order: SubscriptionPayment;
};

// SECTION PaymentStripe creates a stripe payment intent, and then use it to display payment form provided by stripe (<Elements/>).
// Following the payment form, a Pay button is displayed (<StripePayButton/>) for user to process the payment.
//
const SubscriptionStripe: React.FC<paymentProps> = ({ order }) => {
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "payment-stripe");

  if (!order.id) throw Error("order is required.");
  if (Number.isNaN(Number(order.amount)))
    throw Error("orderTotal must be a number.");

  if (Number(order.amount) <= 0)
    throw Error("orderTotal should greater than zero.");

  const [clientSecret, setClientSecret] = useState("");

  //console.log(JSON.stringify(order.isPaid));
  //console.log(`clientSecret:${JSON.stringify(clientSecret)}`);


  //call payment intent api to get client secret
  useEffect(() => {
    if (order.isPaid) return;
    //if (clientSecret !== null) return;

    const url = `${process.env.NEXT_PUBLIC_API_URL}/payment/stripe/create-payment-intent`;
    const body = JSON.stringify({
      stripeCustomerId: order.userId, // this should be stripe customer id
      total: Number(order.amount),
      currency: order.currency,
    });

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    })
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.client_secret);
        console.log(`clientSecret: ${JSON.stringify(data.client_secret)}`);
      });
  }, [order]);

  const session = useSession();
  let email = session.data?.user?.email as string;
  if (!email) email = "";

  let name = session.data?.user?.name as string;
  if (!name) name = "";

  const { resolvedTheme } = useTheme();
  //console.log(resolvedTheme);
  const appearance: Appearance = {
    theme: resolvedTheme === "light" ? "flat" : "night",
  };


  const options: StripeElementsOptions = {
    // pass the client secret
    clientSecret: clientSecret,
    //mode: "payment",
    //amount: orderTotal * 100,
    //currency: currency,
    // Fully customizable with appearance API.
    appearance: appearance,

    // Enable the skeleton loader UI for optimal loading.
    loader: 'auto',
  };

  const stripePromise = getStripe();

  return (
    clientSecret !== 'undefined' &&
    clientSecret !== "" &&
    stripePromise !== null && (
      <Elements options={options} stripe={stripePromise}>
        <LinkAuthenticationElement
          id="link-authentication-element"
          // Access the email value like so:
          // onChange={(event) => {
          //  setEmail(event.value.email);
          // }}
          //
          // Prefill the email field like so:
          options={{ defaultValues: { email: email } }}
        />
        <div className='h-screen w-full mt-auto pt-10'>
          <StripeCheckoutForm order={order} />

          <div>
            {t("payment_stripe_payAmount")}
            {Number(order.amount)} {order.currency.toUpperCase()}
          </div>

        </div>


      </Elements>
    )
  );
};

const defaultFormFields = {
  displayName: "",
  email: "",
};

//SECTION - As user clicks the pay button, we call stripe.confirmPayment to verify the payment status.
// If payment is confirmed, redirect user to success page (return_url).
// if payment is NOT confirmed, display error message.
//
const StripeCheckoutForm: React.FC<paymentProps> = ({ order }) => {
  const params = useParams();

  const router = useRouter();
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "payment-stripe");

  //const [mounted, setMounted] = useState(false);

  const elements = useElements();
  const stripe = useStripe();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [formFields, setFormFields] = useState(defaultFormFields);
  //const { displayName, email } = formFields;
  const returnUrl = `${getAbsoluteUrl()}/storeAdmin/${params.storeId}/subscribe/${order.id}/stripe/confirmed`;

  const fetchData = async () => {
    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // redirect to route thankyou
        //return_url: 'http://localhost:3001/checkout/success',
        return_url: returnUrl,
      },
    });

    if (error) {
      // This point will only be reached if there is an immediate error when
      // confirming the payment. Show error to your customer (for example, payment
      // details incomplete)
      setErrorMessage(error.message);
      console.log(`paymentHandler: ${error.message}`);
    } else {
      // Your customer will be redirected to your `return_url`. For some payment
      // methods like iDEAL, your customer will be redirected to an intermediate
      // site first to authorize the payment, then redirected to the `return_url`.
      console.log("payment confirmed");
      router.push(returnUrl);
    }
  };

  // if payment is not confirmed, do this every 5 sec.
  const IntervaledContent = () => {
    const [count, setCount] = useState<number>(0);

    useEffect(() => {
      //Implementing the setInterval method
      const interval = setInterval(() => {
        fetchData();
        setCount(count + 1);

        if (count > 5) {
          // give up after 5 retries
          clearInterval(interval);
        }
      }, 3000); // do every 3 sec.

      //Clearing the interval
      return () => clearInterval(interval);
    }, [count]);
  };

  const paymentHandler = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    setIsProcessingPayment(true);

    // first fetch
    fetchData();

    IntervaledContent();

    setIsProcessingPayment(false);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormFields({ ...formFields, [name]: value });
  };

  return (
    <form onSubmit={paymentHandler}>
      {errorMessage && (
        <div className="bold mt-2 rounded-md bg-pink-100 p-2 text-pink-500">
          {errorMessage}
        </div>
      )}
      <PaymentElement
        id="payment-element"
        options={{
          layout: {
            type: 'tabs',
            defaultCollapsed: false,
          }
        }}
      />

      {/* isLoading will disable the button on its first click.
          //bg-gradient-to-r from-purple-400 to-pink-600 font-semibold hover:from-green-400 hover:to-blue-500 */}
      <Button
        disabled={isProcessingPayment}
        type="submit"
        className="w-full disabled:opacity-25"
      >
        {t("payment_stripeForm_payButton")}
      </Button>
    </form>
  );
};
